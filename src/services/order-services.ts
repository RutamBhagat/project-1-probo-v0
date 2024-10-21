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
  // Use serializable isolation for strict consistency
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

      // Initial balance lock
      await prisma.inrBalance.update({
        where: { userId },
        data: {
          balance: { decrement: totalCost },
          lockedBalance: { increment: totalCost },
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
            lte: price,
          },
        },
        orderBy: [{ price: 'asc' }, { createdAt: 'asc' }],
      })

      logger.debug('Processing matching orders', {
        count: matchingSellOrders.length,
      })

      // Process each matching trade
      for (const sellOrder of matchingSellOrders) {
        if (remainingBuyQuantity === BigInt(0)) break

        const tradeQuantity =
          sellOrder.remainingQuantity < remainingBuyQuantity
            ? sellOrder.remainingQuantity
            : remainingBuyQuantity

        const tradeValue = tradeQuantity * sellOrder.price
        const priceDifference = price - sellOrder.price
        const priceUnlock = tradeQuantity * priceDifference

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
          data: { balance: { increment: tradeValue } },
        })

        await prisma.stockBalance.update({
          where: {
            userId_symbolId_tokenType: {
              userId: sellOrder.userId,
              symbolId,
              tokenType,
            },
          },
          data: { lockedQuantity: { decrement: tradeQuantity } },
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

        spentAmount += tradeValue
        totalPriceUnlock += priceUnlock
        remainingBuyQuantity -= tradeQuantity
        matchedPrice = sellOrder.price

        logger.debug('Trade completed', {
          remainingQuantity: remainingBuyQuantity.toString(),
          spentSoFar: spentAmount.toString(),
          totalPriceUnlock: totalPriceUnlock.toString(),
        })
      }

      // Calculate final amounts
      const remainingLocked = remainingBuyQuantity * price

      balanceUpdates.spent = spentAmount
      balanceUpdates.priceUnlock = totalPriceUnlock
      balanceUpdates.remainingLocked = remainingLocked

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
          remainingQuantity: remainingBuyQuantity,
          status:
            remainingBuyQuantity === BigInt(0) ? 'FILLED' : 'PARTIALLY_FILLED',
        },
      })

      // Perform final balance updates
      const finalBalanceUpdate = await prisma.inrBalance.update({
        where: { userId },
        data: {
          // Only unlock the spent amount plus price difference unlocks
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
        finalBalance: finalBalanceUpdate,
      })

      return {
        matchedPrice: matchedPrice === price ? null : matchedPrice,
        remainingQuantity: remainingBuyQuantity,
      }
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
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
