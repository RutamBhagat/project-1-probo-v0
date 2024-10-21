// services/orderBookService.ts

import { prisma } from '@/app'
import { Logger } from '@/utils/logger'
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

// Initialize logger
const logger = new Logger('OrderBookService')

export const getOrderBook = async (): Promise<OrderBookStructure> => {
  logger.debug('Fetching orders from the database')

  const orders = (await prisma.order.findMany({
    where: {
      status: {
        in: ['OPEN', 'PARTIALLY_FILLED'],
      },
    },
    include: {
      symbol: true,
    },
  })) as OrderWithSymbol[]

  logger.debug('Orders successfully fetched', { orderCount: orders.length })

  // Initialize empty order book with proper typing
  const orderBook: OrderBookStructure = {}

  for (const order of orders) {
    const { symbolId, tokenType, price, userId, remainingQuantity } = order

    logger.debug('Processing order', { symbolId, tokenType, price, userId })

    // Validate and initialize symbol level
    if (!orderBook[symbolId]) {
      logger.debug('Initialized symbol level', { symbolId })
      orderBook[symbolId] = {}
    }
    const symbolBook = orderBook[symbolId]

    // Validate and initialize token type level
    if (!symbolBook[tokenType]) {
      logger.debug('Initialized token type level', { tokenType })
      symbolBook[tokenType] = {}
    }
    const tokenBook = symbolBook[tokenType]

    // Validate and initialize price level
    const priceStr = price.toString()
    if (!tokenBook[priceStr]) {
      logger.debug('Initialized price level', { price: priceStr })
      tokenBook[priceStr] = {
        total: BigInt(0),
        orders: {},
      }
    }
    const priceLevel = tokenBook[priceStr]

    // Safely update total
    priceLevel.total = priceLevel.total + BigInt(remainingQuantity)
    logger.debug('Updated price level total', {
      price: priceStr,
      newTotal: priceLevel.total.toString(),
    })

    // Safely initialize and update user orders
    if (!priceLevel.orders[userId]) {
      logger.debug('Initialized user order', { userId })
      priceLevel.orders[userId] = BigInt(0)
    }
    priceLevel.orders[userId] =
      priceLevel.orders[userId] + BigInt(remainingQuantity)
    logger.debug('Updated user order', {
      userId,
      newOrderQuantity: priceLevel.orders[userId].toString(),
    })
  }

  logger.debug('Order book successfully generated')

  return orderBook
}

// Helper function to safely serialize the order book for JSON response
export const serializeOrderBook = (orderBook: OrderBookStructure): unknown => {
  return JSON.parse(
    JSON.stringify(orderBook, (_, value) =>
      typeof value === 'bigint' ? Number(value) : value
    )
  )
}
