import { getOrderBook } from '@/services/orderbook-services'
import type { Request, Response } from 'express'

export const handleGetOrderBook = async (req: Request, res: Response) => {
  try {
    const orderBook = await getOrderBook()

    // Convert BigInts to strings for JSON serialization
    const serializedOrderBook = JSON.parse(
      JSON.stringify(orderBook, (_, value) =>
        typeof value === 'bigint' ? value.toString() : value
      )
    )

    return res.status(200).json(serializedOrderBook)
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'
    return res.status(500).json({ message: errorMessage })
  }
}
