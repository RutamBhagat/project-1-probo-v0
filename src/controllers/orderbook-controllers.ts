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
    // Fetch the order book from the service
    const orderBook = await getOrderBook()

    // Serialize the order book to convert BigInts to Numbers
    const serializedOrderBook = serializeOrderBook(
      orderBook
    ) as SerializedOrderBook

    // Return a 200 response with the serialized order book
    return res.status(200).json(serializedOrderBook)
  } catch (error) {
    // Capture and log the error (optional: using a logger)
    console.error('Error fetching order book:', error)

    // Ensure the error message is safe to send to clients
    const errorMessage =
      error instanceof Error ? error.message : 'An unexpected error occurred.'

    // Return a 500 error response with the error message
    return res.status(500).json({ message: errorMessage })
  }
}
