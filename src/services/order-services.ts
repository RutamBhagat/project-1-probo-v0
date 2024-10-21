import { prisma } from '@/app'
import { Logger } from '@/utils/logger'
import { Prisma } from '@prisma/client'

const logger = new Logger('BuyOrderService')

interface TradeResult {
  matchedPrice: bigint | null
  remainingQuantity: bigint
}

interface BalanceUpdate {
  initialLock: bigint
  spent: bigint
  priceUnlock: bigint
  remainingLocked: bigint
}

export async function createBuyOrder(
  userId: string,
  symbolId: string,
  quantity: bigint,
  price: bigint,
  tokenType: string
): Promise<TradeResult> {
  return await prisma.$transaction(
    async (prisma) => {
      const balanceUpdates: BalanceUpdate = {
        initialLock: BigInt(0),
        spent: BigInt(0),
        priceUnlock: BigInt(0),
        remainingLocked: BigInt(0),
      }

      const totalCost = quantity * price
      balanceUpdates.initialLock = totalCost

      logger.debug('Starting buy order', {
        userId,
        quantity: quantity.toString(),
        price: price.toString(),
        totalCost: totalCost.toString(),
      })

      // Verify and lock initial balance
      const buyerBalance = await prisma.inrBalance.findUnique({
        where: { userId },
      })

      if (!buyerBalance || buyerBalance.balance < totalCost) {
        logger.error('Insufficient balance', {
          required: totalCost.toString(),
          available: buyerBalance?.balance.toString() || '0',
        })
        throw new Error('Insufficient INR balance')
      }

      // Initial balance lock: lock the entire totalCost
      await prisma.inrBalance.update({
        where: { userId },
        data: {
          balance: { decrement: totalCost }, // Deduct the total cost from available balance
          lockedBalance: { increment: totalCost }, // Lock the entire amount
        },
      })

      logger.debug('Initial balance locked', {
        amount: totalCost.toString(),
        userId,
      })

      let spentAmount = BigInt(0)
      let remainingBuyQuantity = quantity
      let matchedPrice: bigint | null = null
      let totalPriceUnlock = BigInt(0)

      const buyOrder = await prisma.order.create({
        data: {
          userId,
          symbolId,
          orderType: 'BUY',
          tokenType,
          quantity,
          remainingQuantity: quantity,
          price,
          status: 'OPEN',
        },
      })

      // Find and process matching sell orders
      const matchingSellOrders = await prisma.order.findMany({
        where: {
          symbolId,
          tokenType,
          orderType: 'SELL',
          status: 'OPEN',
          price: {
            lte: price, // Match orders with sell price <= buy price
          },
        },
        orderBy: [{ price: 'asc' }, { createdAt: 'asc' }],
      })

      logger.debug('Processing matching orders', {
        count: matchingSellOrders.length,
      })

      // Process each matching trade
      for (const sellOrder of matchingSellOrders) {
        if (remainingBuyQuantity === BigInt(0)) break // Exit if no quantity left to buy

        const tradeQuantity =
          sellOrder.remainingQuantity < remainingBuyQuantity
            ? sellOrder.remainingQuantity
            : remainingBuyQuantity

        const tradeValue = tradeQuantity * sellOrder.price
        const priceDifference = price - sellOrder.price // Price difference between buy and sell
        const priceUnlock = tradeQuantity * priceDifference // Amount to unlock due to price difference

        logger.debug('Processing trade', {
          tradeQuantity: tradeQuantity.toString(),
          tradeValue: tradeValue.toString(),
          priceDifference: priceDifference.toString(),
          priceUnlock: priceUnlock.toString(),
        })

        // Create trade record
        await prisma.trade.create({
          data: {
            symbolId,
            tokenType,
            buyerId: userId,
            sellerId: sellOrder.userId,
            buyerOrderId: buyOrder.id,
            sellerOrderId: sellOrder.id,
            quantity: tradeQuantity,
            price: sellOrder.price,
          },
        })

        // Update buyer's stock balance
        await prisma.stockBalance.upsert({
          where: {
            userId_symbolId_tokenType: {
              userId,
              symbolId,
              tokenType,
            },
          },
          update: { quantity: { increment: tradeQuantity } },
          create: {
            userId,
            symbolId,
            tokenType,
            quantity: tradeQuantity,
          },
        })

        // Update seller's balances
        await prisma.inrBalance.update({
          where: { userId: sellOrder.userId },
          data: { balance: { increment: tradeValue } }, // Add INR to the seller's balance
        })

        await prisma.stockBalance.update({
          where: {
            userId_symbolId_tokenType: {
              userId: sellOrder.userId,
              symbolId,
              tokenType,
            },
          },
          data: { lockedQuantity: { decrement: tradeQuantity } }, // Release the seller's locked stock
        })

        // Update sell order status
        await prisma.order.update({
          where: { id: sellOrder.id },
          data: {
            remainingQuantity: { decrement: tradeQuantity },
            status:
              sellOrder.remainingQuantity === tradeQuantity
                ? 'FILLED'
                : 'PARTIALLY_FILLED',
          },
        })

        spentAmount += tradeValue // Track total amount spent so far
        totalPriceUnlock += priceUnlock // Track the total price unlock amount
        remainingBuyQuantity -= tradeQuantity // Decrease remaining quantity to buy
        matchedPrice = sellOrder.price // Update matched price to the sell price

        logger.debug('Trade completed', {
          remainingQuantity: remainingBuyQuantity.toString(),
          spentSoFar: spentAmount.toString(),
          totalPriceUnlock: totalPriceUnlock.toString(),
        })
      }

      // Final balance calculations
      const remainingLocked = remainingBuyQuantity * price // Lock the remaining quantity not yet matched

      balanceUpdates.spent = spentAmount // Total amount spent on trades
      balanceUpdates.priceUnlock = totalPriceUnlock // Total amount unlocked due to price differences
      balanceUpdates.remainingLocked = remainingLocked // Amount still locked for remaining quantity

      logger.debug('Final balance calculations', {
        totalCost: totalCost.toString(),
        spentAmount: spentAmount.toString(),
        priceUnlock: totalPriceUnlock.toString(),
        remainingLocked: remainingLocked.toString(),
      })

      // Update buy order status
      await prisma.order.update({
        where: { id: buyOrder.id },
        data: {
          remainingQuantity: remainingBuyQuantity, // Update remaining buy quantity
          status:
            remainingBuyQuantity === BigInt(0) ? 'FILLED' : 'PARTIALLY_FILLED', // Set status based on remaining quantity
        },
      })

      // **Fix**: Ensure that lockedBalance decrement does not include unmatchedQuantityPriceUnlock
      await prisma.inrBalance.update({
        where: { userId },
        data: {
          // Unlock only the spent amount and total price unlock
          lockedBalance: {
            decrement: spentAmount + totalPriceUnlock,
          },
          // Return price difference unlocks to available balance
          balance: {
            increment: totalPriceUnlock,
          },
        },
      })

      logger.debug('Order completed', {
        balanceUpdates,
      })

      return {
        matchedPrice: matchedPrice === price ? null : matchedPrice, // Null if matched exactly at buy price
        remainingQuantity: remainingBuyQuantity, // Return remaining quantity after all trades
      }
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable, // Ensure strict isolation for consistency
    }
  )
}

export const createSellOrder = async (
  userId: string,
  symbolId: string,
  quantity: bigint,
  price: bigint,
  tokenType: string
) => {
  // First check if user has enough balance
  const stockBalance = await prisma.stockBalance.findUnique({
    where: {
      userId_symbolId_tokenType: {
        userId,
        symbolId,
        tokenType,
      },
    },
  })

  if (!stockBalance || stockBalance.quantity < quantity) {
    throw new Error('Insufficient stock balance')
  }

  // Lock the tokens
  await prisma.stockBalance.update({
    where: {
      userId_symbolId_tokenType: {
        userId,
        symbolId,
        tokenType,
      },
    },
    data: {
      quantity: {
        decrement: quantity,
      },
      lockedQuantity: {
        increment: quantity,
      },
    },
  })

  // Create sell order
  await prisma.order.create({
    data: {
      userId,
      symbolId,
      orderType: 'SELL',
      tokenType,
      quantity,
      remainingQuantity: quantity,
      price,
      status: 'OPEN',
    },
  })
}

export const cancelOrder = async (
  userId: string,
  symbolId: string,
  quantity: bigint,
  price: bigint,
  tokenType: string,
  orderType: 'BUY' | 'SELL'
) => {
  // Find the matching order
  const order = await prisma.order.findFirst({
    where: {
      userId,
      symbolId,
      tokenType,
      orderType,
      price,
      status: 'OPEN',
      remainingQuantity: quantity,
    },
  })

  if (!order) {
    throw new Error('Order not found')
  }

  // Update order status
  await prisma.order.update({
    where: { id: order.id },
    data: { status: 'CANCELLED' },
  })

  // Return locked assets
  if (orderType === 'SELL') {
    // Return locked tokens
    await prisma.stockBalance.update({
      where: {
        userId_symbolId_tokenType: {
          userId,
          symbolId,
          tokenType,
        },
      },
      data: {
        quantity: { increment: quantity },
        lockedQuantity: { decrement: quantity },
      },
    })
  } else {
    // Return locked INR
    const lockedAmount = quantity * price
    await prisma.inrBalance.update({
      where: { userId },
      data: {
        balance: { increment: lockedAmount },
        lockedBalance: { decrement: lockedAmount },
      },
    })
  }
}
