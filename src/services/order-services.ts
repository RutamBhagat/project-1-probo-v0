import { prisma } from '@/app'
import type { Order, Symbol } from '@prisma/client'

// Define explicit types for the order book structure
type UserId = string
type SymbolId = string
type TokenType = string
type PriceLevel = {
  total: bigint
  orders: Record<UserId, bigint>
}

type OrderBookPriceMap = Record<string, PriceLevel>
type OrderBookTokenTypeMap = Record<TokenType, OrderBookPriceMap>
type OrderBookStructure = Record<SymbolId, OrderBookTokenTypeMap>

// Define the type for the order with included symbol
type OrderWithSymbol = Order & {
  symbol: Symbol
}

export const getOrderBook = async (): Promise<OrderBookStructure> => {
  const orders = (await prisma.order.findMany({
    where: {
      status: 'OPEN',
    },
    include: {
      symbol: true,
    },
  })) as OrderWithSymbol[]

  // Initialize empty order book with proper typing
  const orderBook: OrderBookStructure = {}

  for (const order of orders) {
    const { symbolId, tokenType, price, userId, remainingQuantity } = order

    // Safely initialize and access symbol level
    orderBook[symbolId] = orderBook[symbolId] || {}
    const symbolBook = orderBook[symbolId]

    // Safely initialize and access token type level
    symbolBook[tokenType] = symbolBook[tokenType] || {}
    const tokenBook = symbolBook[tokenType]

    // Safely initialize and access price level
    const priceStr = price.toString()
    tokenBook[priceStr] = tokenBook[priceStr] || {
      total: BigInt(0),
      orders: {},
    }
    const priceLevel = tokenBook[priceStr]

    // Safely update total
    priceLevel.total = priceLevel.total + remainingQuantity

    // Safely initialize and update user orders
    priceLevel.orders[userId] =
      (priceLevel.orders[userId] || BigInt(0)) + remainingQuantity
  }

  return orderBook
}

// Helper function to safely serialize the order book for JSON response
export const serializeOrderBook = (orderBook: OrderBookStructure): unknown => {
  return JSON.parse(
    JSON.stringify(orderBook, (_, value) =>
      typeof value === 'bigint' ? value.toString() : value
    )
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

export async function createBuyOrder(
  userId: string,
  symbolId: string,
  quantity: bigint,
  price: bigint,
  tokenType: string
): Promise<void> {
  // Use a transaction to ensure all operations are atomic
  await prisma.$transaction(async (prisma) => {
    // 1. Validate and lock buyer's INR balance
    const totalCost = quantity * price
    const buyerBalance = await prisma.inrBalance.findUnique({
      where: { userId },
    })

    if (!buyerBalance || buyerBalance.balance < totalCost) {
      throw new Error('Insufficient INR balance')
    }

    // Lock buyer's funds
    await prisma.inrBalance.update({
      where: { userId },
      data: {
        balance: { decrement: totalCost },
        lockedBalance: { increment: totalCost },
      },
    })

    // 2. Create buy order first
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

    // 3. Find matching sell orders
    const matchingSellOrder = await prisma.order.findFirst({
      where: {
        symbolId,
        tokenType,
        orderType: 'SELL',
        status: 'OPEN',
        price: {
          lte: price,
        },
        remainingQuantity: {
          gte: quantity,
        },
      },
      orderBy: [{ price: 'asc' }, { createdAt: 'asc' }],
    })

    if (matchingSellOrder) {
      // 4. Create the trade
      await prisma.trade.create({
        data: {
          symbolId,
          tokenType,
          buyerId: userId,
          sellerId: matchingSellOrder.userId,
          buyerOrderId: buyOrder.id,
          sellerOrderId: matchingSellOrder.id,
          quantity,
          price: matchingSellOrder.price,
        },
      })

      // 5. Update seller's locked tokens
      await prisma.stockBalance.update({
        where: {
          userId_symbolId_tokenType: {
            userId: matchingSellOrder.userId,
            symbolId,
            tokenType,
          },
        },
        data: {
          lockedQuantity: { decrement: quantity },
        },
      })

      // 6. Update seller's INR balance
      const tradeValue = quantity * matchingSellOrder.price
      await prisma.inrBalance.update({
        where: { userId: matchingSellOrder.userId },
        data: {
          balance: { increment: tradeValue },
        },
      })

      // 7. Update buyer's INR balance (refund excess if any)
      const refundAmount = totalCost - tradeValue
      await prisma.inrBalance.update({
        where: { userId },
        data: {
          lockedBalance: { decrement: totalCost },
          balance: { increment: refundAmount },
        },
      })

      // 8. Update buyer's token balance
      await prisma.stockBalance.upsert({
        where: {
          userId_symbolId_tokenType: {
            userId,
            symbolId,
            tokenType,
          },
        },
        update: {
          quantity: { increment: quantity },
        },
        create: {
          userId,
          symbolId,
          tokenType,
          quantity,
        },
      })

      // 9. Update orders status
      await prisma.order.update({
        where: { id: matchingSellOrder.id },
        data: {
          remainingQuantity: { decrement: quantity },
          status:
            matchingSellOrder.remainingQuantity === quantity
              ? 'FILLED'
              : 'PARTIALLY_FILLED',
        },
      })

      await prisma.order.update({
        where: { id: buyOrder.id },
        data: {
          remainingQuantity: { decrement: quantity },
          status: 'FILLED',
        },
      })
    } else {
      // If no matching sell order, unlock buyer's funds
      await prisma.inrBalance.update({
        where: { userId },
        data: {
          balance: { increment: totalCost },
          lockedBalance: { decrement: totalCost },
        },
      })

      throw new Error('No matching sell order found')
    }
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
