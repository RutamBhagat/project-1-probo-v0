import { createBuyOrder, createSellOrder } from '@/services/order-services'
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
    res.status(500).json({ message: errorMessage })
  }
}
