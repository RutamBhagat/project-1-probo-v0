import {
  createBuyOrder,
  createSellOrder,
  cancelOrder,
  getOrderBook,
} from '@/services/order-services'
import type { Request, Response } from 'express'

type OrderRequestBody = {
  userId: string
  stockSymbol: string
  quantity: string
  price: string
  stockType: string
}

type OrderResponse = {
  message: string
}

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

export const handleSellOrder = async (
  req: Request<{}, OrderResponse, OrderRequestBody>,
  res: Response<OrderResponse>
) => {
  try {
    const { userId, stockSymbol, quantity, price, stockType } = req.body
    await createSellOrder(
      userId,
      stockSymbol,
      BigInt(quantity),
      BigInt(price),
      stockType
    )
    return res.status(200).json({
      message: `Sell order placed for ${quantity} '${stockType}' options at price ${price}.`,
    })
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'
    return res.status(500).json({ message: errorMessage })
  }
}

export const handleBuyOrder = async (
  req: Request<{}, OrderResponse, OrderRequestBody>,
  res: Response<OrderResponse>
): Promise<void> => {
  try {
    const { userId, stockSymbol, quantity, price, stockType } = req.body

    if (!userId || !stockSymbol || !quantity || !price || !stockType) {
      res.status(400).json({ message: 'Missing required fields' })
      return
    }

    await createBuyOrder(
      userId,
      stockSymbol,
      BigInt(quantity),
      BigInt(price),
      stockType.toLowerCase()
    )

    res.status(200).json({ message: 'Buy order placed and trade executed' })
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'
    console.error('Buy order error:', errorMessage)
    res.status(400).json({ message: errorMessage })
  }
}

export const handleCancelOrder = async (
  req: Request<
    {},
    OrderResponse,
    OrderRequestBody & { orderType: 'BUY' | 'SELL' }
  >,
  res: Response<OrderResponse>
) => {
  try {
    const { userId, stockSymbol, quantity, price, stockType, orderType } =
      req.body

    await cancelOrder(
      userId,
      stockSymbol,
      BigInt(quantity),
      BigInt(price),
      stockType,
      orderType
    )

    return res.status(200).json({
      message: `${orderType} order canceled`,
    })
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'
    return res.status(400).json({ message: errorMessage })
  }
}
