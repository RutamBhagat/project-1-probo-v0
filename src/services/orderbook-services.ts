import { prisma } from '@/app'
import { Logger } from '@/utils/logger'
import type { Order, Symbol } from '@prisma/client'

// Define stricter types for the order book structure
type UserId = string
type SymbolId = string
type TokenType = string

interface PriceLevel {
  total: bigint
  orders: Record<UserId, bigint>
}

interface OrderBookPriceMap {
  [price: string]: PriceLevel
}

interface OrderBookTokenTypeMap {
  [tokenType: string]: OrderBookPriceMap
}

interface OrderBookStructure {
  [symbolId: string]: OrderBookTokenTypeMap
}

type OrderWithSymbol = Order & {
  symbol: Symbol
}

const logger = new Logger('OrderBookService')

export const getOrderBook = async (): Promise<OrderBookStructure> => {
  logger.debug('Fetching orders from the database')

  const orders = (await prisma.order.findMany({
    where: {
      AND: [
        {
          status: {
            in: ['OPEN', 'PARTIALLY_FILLED'],
          },
        },
        {
          remainingQuantity: {
            gt: 0,
          },
        },
      ],
    },
    include: {
      symbol: true,
    },
    orderBy: {
      price: 'asc',
    },
  })) as OrderWithSymbol[]

  logger.debug('Orders successfully fetched', { orderCount: orders.length })

  const orderBook: OrderBookStructure = {}

  for (const order of orders) {
    const { symbolId, tokenType, price, userId, remainingQuantity } = order

    if (BigInt(remainingQuantity) <= BigInt(0)) {
      continue
    }

    logger.debug('Processing order', { symbolId, tokenType, price, userId })

    // Initialize with type assertion
    if (!orderBook[symbolId]) {
      logger.debug('Initialized symbol level', { symbolId })
      orderBook[symbolId] = {} as OrderBookTokenTypeMap
    }

    if (!orderBook[symbolId][tokenType]) {
      logger.debug('Initialized token type level', { tokenType })
      orderBook[symbolId][tokenType] = {} as OrderBookPriceMap
    }

    const priceStr = price.toString()
    const tokenBook = orderBook[symbolId][tokenType]

    if (!tokenBook[priceStr]) {
      logger.debug('Initialized price level', { price: priceStr })
      tokenBook[priceStr] = {
        total: BigInt(0),
        orders: {} as Record<UserId, bigint>,
      }
    }

    // Safe access with non-null assertion after check
    const priceLevel = tokenBook[priceStr]!

    priceLevel.total += BigInt(remainingQuantity)
    logger.debug('Updated price level total', {
      price: priceStr,
      newTotal: priceLevel.total.toString(),
    })

    if (!priceLevel.orders[userId]) {
      logger.debug('Initialized user order', { userId })
      priceLevel.orders[userId] = BigInt(0)
    }

    priceLevel.orders[userId] += BigInt(remainingQuantity)
    logger.debug('Updated user order', {
      userId,
      newOrderQuantity: priceLevel.orders[userId].toString(),
    })
  }

  logger.debug('Order book successfully generated')
  return orderBook
}

export const serializeOrderBook = (orderBook: OrderBookStructure): unknown => {
  return JSON.parse(
    JSON.stringify(orderBook, (_, value) =>
      typeof value === 'bigint' ? Number(value) : value
    )
  )
}
