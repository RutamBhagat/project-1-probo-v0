import { prisma } from '@/app'
import { Logger } from '@/utils/logger'
import { Prisma } from '@prisma/client'

const logger = new Logger('BuyOrderService')

export enum OrderStatus {
  OPEN = 'OPEN',
  PARTIALLY_FILLED = 'PARTIALLY_FILLED',
  FILLED = 'FILLED',
  CANCELLED = 'CANCELLED',
}

interface TradeResult {
  matchedPrice: bigint | null
  remainingQuantity: bigint
  status: OrderStatus
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
      const totalOrderValue = quantity * price

      logger.debug('Starting buy order', {
        userId,
        quantity: quantity.toString(),
        price: price.toString(),
        totalOrderValue: totalOrderValue.toString(),
      })

      // Verify balance
      const buyerBalance = await prisma.inrBalance.findUnique({
        where: { userId },
      })

      if (!buyerBalance || buyerBalance.balance < totalOrderValue) {
        logger.error('Insufficient balance', {
          required: totalOrderValue.toString(),
          available: buyerBalance?.balance.toString() || '0',
        })
        throw new Error('Insufficient INR balance')
      }

      // Create the buy order first
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

      logger.debug('Processing matching orders', {
        count: matchingSellOrders.length,
      })

      let remainingQuantity = quantity
      let spentAmount = BigInt(0)
      let matchedPrice: bigint | null = null
      let orderStatus: OrderStatus = OrderStatus.OPEN

      // Process matching trades
      for (const sellOrder of matchingSellOrders) {
        if (remainingQuantity === BigInt(0)) break

        const tradeQuantity =
          sellOrder.remainingQuantity < remainingQuantity
            ? sellOrder.remainingQuantity
            : remainingQuantity

        const tradeValue = tradeQuantity * sellOrder.price

        logger.debug('Processing trade', {
          tradeQuantity: tradeQuantity.toString(),
          tradeValue: tradeValue.toString(),
          sellerPrice: sellOrder.price.toString(),
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
        remainingQuantity -= tradeQuantity
        matchedPrice = sellOrder.price

        logger.debug('Trade completed', {
          remainingQuantity: remainingQuantity.toString(),
          spentSoFar: spentAmount.toString(),
        })
      }

      // Determine final order status
      if (remainingQuantity === BigInt(0)) {
        orderStatus = OrderStatus.FILLED
      } else if (remainingQuantity < quantity) {
        orderStatus = OrderStatus.PARTIALLY_FILLED
      }

      // Update buy order status
      await prisma.order.update({
        where: { id: buyOrder.id },
        data: {
          remainingQuantity,
          status: orderStatus,
        },
      })

      // Calculate final balance adjustments
      const remainingOrderValue = remainingQuantity * price
      const totalDeduction = spentAmount + remainingOrderValue
      const refundAmount = totalOrderValue - totalDeduction

      logger.debug('Final balance calculations', {
        totalOrderValue: totalOrderValue.toString(),
        spentAmount: spentAmount.toString(),
        remainingOrderValue: remainingOrderValue.toString(),
        refundAmount: refundAmount.toString(),
      })

      // Single balance update operation
      await prisma.inrBalance.update({
        where: { userId },
        data: {
          balance: { decrement: totalDeduction },
          lockedBalance: { increment: remainingOrderValue },
        },
      })

      logger.debug('Order completed', {
        status: orderStatus,
        remainingQuantity: remainingQuantity.toString(),
        matchedPrice: matchedPrice?.toString() || null,
      })

      return {
        matchedPrice: matchedPrice === price ? null : matchedPrice,
        remainingQuantity,
        status: orderStatus,
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
      status: {
        in: ['OPEN', 'PARTIALLY_FILLED'],
      },
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
