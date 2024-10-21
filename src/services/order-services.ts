import { prisma } from '@/app'
import { Logger } from '@/utils/logger'

const logger = new Logger('BuyOrderService')

interface TradeResult {
  matchedPrice: bigint | null
  remainingQuantity: bigint
}

interface BalanceUpdate {
  initialLock: bigint
  spent: bigint
  unlocked: bigint
  remaining: bigint
}

export async function createBuyOrder(
  userId: string,
  symbolId: string,
  quantity: bigint,
  price: bigint,
  tokenType: string
): Promise<TradeResult> {
  return await prisma.$transaction(async (prisma) => {
    const balanceUpdates: BalanceUpdate = {
      initialLock: BigInt(0),
      spent: BigInt(0),
      unlocked: BigInt(0),
      remaining: BigInt(0),
    }

    const totalCost = quantity * price
    balanceUpdates.initialLock = totalCost

    logger.debug('Starting buy order', {
      userId,
      quantity: quantity.toString(),
      price: price.toString(),
      totalCost: totalCost.toString(),
    })

    // Check and lock buyer's balance
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

    // Lock the full amount initially
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

    // Create the buy order
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

    logger.debug('Buy order created', { orderId: buyOrder.id })

    // Find matching sell orders
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

    logger.debug('Found matching sell orders', {
      count: matchingSellOrders.length,
    })

    // Process each matching sell order
    for (const sellOrder of matchingSellOrders) {
      if (remainingBuyQuantity === BigInt(0)) break

      const tradeQuantity =
        sellOrder.remainingQuantity < remainingBuyQuantity
          ? sellOrder.remainingQuantity
          : remainingBuyQuantity

      const tradeValue = tradeQuantity * sellOrder.price

      logger.debug('Processing trade', {
        sellOrderId: sellOrder.id,
        quantity: tradeQuantity.toString(),
        price: sellOrder.price.toString(),
        value: tradeValue.toString(),
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

      // Update balances
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

      // Update seller's balance
      await prisma.inrBalance.update({
        where: { userId: sellOrder.userId },
        data: { balance: { increment: tradeValue } },
      })

      spentAmount += tradeValue
      balanceUpdates.spent = spentAmount

      // Update sell order
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

      // Update seller's stock balance
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

      remainingBuyQuantity -= tradeQuantity
      matchedPrice = sellOrder.price

      logger.debug('Trade completed', {
        remainingQuantity: remainingBuyQuantity.toString(),
        spentSoFar: spentAmount.toString(),
      })
    }

    // Calculate final amounts
    const remainingOrderCost = remainingBuyQuantity * price
    balanceUpdates.remaining = remainingOrderCost

    // Calculate unlock amount based on price differences
    const unlockAmount = totalCost - (spentAmount + remainingOrderCost)
    balanceUpdates.unlocked = unlockAmount

    logger.debug('Final balance calculations', {
      totalCost: totalCost.toString(),
      spentAmount: spentAmount.toString(),
      remainingOrderCost: remainingOrderCost.toString(),
      unlockAmount: unlockAmount.toString(),
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

    // Adjust final balances
    await prisma.inrBalance.update({
      where: { userId },
      data: {
        lockedBalance: { decrement: spentAmount + unlockAmount },
        balance: { increment: unlockAmount },
      },
    })

    logger.debug('Order completed', {
      balanceUpdates,
      finalStatus:
        remainingBuyQuantity === BigInt(0) ? 'FILLED' : 'PARTIALLY_FILLED',
    })

    return {
      matchedPrice: matchedPrice === price ? null : matchedPrice,
      remainingQuantity: remainingBuyQuantity,
    }
  })
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
