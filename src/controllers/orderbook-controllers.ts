import { getOrderBook, serializeOrderBook } from '@/services/orderbook-services'
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

export const handleGetOrderBook = async (
  req: Request,
  res: Response<SerializedOrderBook | ErrorResponse>
) => {
  try {
    const orderBook = await getOrderBook()
    const serializedOrderBook: SerializedOrderBook = serializeOrderBook(
      orderBook
    ) as SerializedOrderBook

    return res.status(200).json(serializedOrderBook)
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'
    return res.status(500).json({ message: errorMessage })
  }
}
