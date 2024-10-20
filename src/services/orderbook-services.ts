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