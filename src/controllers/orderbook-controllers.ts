import { getOrderBook } from '@/services/orderbook-services'
import type { Request, Response } from 'express'

// Define the type for the serialized order book
type SerializedOrderBook = {
  [key: string]: {
    total: number
    orders: {
      [key: string]: number
    }
  }
}

type ErrorResponse = {
  message: string
}

// Utility function to serialize the order book
const serializeOrderBook = (orderBook: any): SerializedOrderBook => {
  // Convert BigInts to strings for JSON serialization
  const serializedOrderBook = JSON.parse(
    JSON.stringify(orderBook, (_, value) =>
      typeof value === 'bigint' ? value.toString() : value
    )
  )

  // Convert stringified numbers back to numbers where appropriate
  const fixedOrderBook = JSON.parse(
    JSON.stringify(serializedOrderBook),
    (_, value) => {
      if (typeof value === 'string' && /^\d+$/.test(value)) {
        return parseInt(value, 10)
      }
      return value
    }
  )

  return fixedOrderBook
}

export const handleGetOrderBook = async (
  req: Request,
  res: Response<SerializedOrderBook | ErrorResponse>
) => {
  try {
    const orderBook = await getOrderBook()
    const serializedOrderBook: SerializedOrderBook =
      serializeOrderBook(orderBook)

    return res.status(200).json(serializedOrderBook)
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'
    return res.status(500).json({ message: errorMessage })
  }
}
