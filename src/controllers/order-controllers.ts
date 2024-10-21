import {
  cancelOrder,
  createBuyOrder,
  createSellOrder,
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
  matchedPrice?: string
  remainingQuantity?: string
}

export const handleBuyOrder = async (
  req: Request<{}, {}, OrderRequestBody>,
  res: Response<OrderResponse>
) => {
  try {
    const { userId, stockSymbol, quantity, price, stockType } = req.body

    // Input validation
    if (!userId || !stockSymbol || !quantity || !price || !stockType) {
      return res.status(400).json({ message: 'Missing required fields' })
    }
    if (isNaN(Number(quantity)) || isNaN(Number(price))) {
      return res
        .status(400)
        .json({ message: 'Quantity and Price must be valid numbers' })
    }

    // Service call to create buy order
    const { matchedPrice, remainingQuantity } = await createBuyOrder(
      userId,
      stockSymbol,
      BigInt(quantity),
      BigInt(price),
      stockType.toLowerCase()
    )

    // Full match
    if (remainingQuantity === BigInt(0)) {
      const message = matchedPrice
        ? `Buy order matched at best price ${matchedPrice.toString()}`
        : 'Buy order placed and fully executed'
      return res.status(200).json({
        message,
        matchedPrice: matchedPrice?.toString(),
      })
    }

    // Partial match - update this to match the test expectation
    if (remainingQuantity > BigInt(0)) {
      const message = `Buy order partially matched, ${remainingQuantity.toString()} tokens remaining` // Updated message to match test
      return res.status(200).json({
        message,
        matchedPrice: matchedPrice?.toString(),
        remainingQuantity: remainingQuantity.toString(),
      })
    }

    return res.status(500).json({ message: 'Unexpected error' })
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error occurred'

    console.error('Error handling buy order:', errorMessage)
    return res.status(400).json({ message: errorMessage })
  }
}

export const handleSellOrder = async (
  req: Request<{}, OrderResponse, OrderRequestBody>,
  res: Response<OrderResponse>
) => {
  try {
    const { userId, stockSymbol, quantity, price, stockType } = req.body

    // Input validation
    if (!userId || !stockSymbol || !quantity || !price || !stockType) {
      return res.status(400).json({ message: 'Missing required fields' })
    }
    if (isNaN(Number(quantity)) || isNaN(Number(price))) {
      return res
        .status(400)
        .json({ message: 'Quantity and Price must be valid numbers' })
    }

    await createSellOrder(
      userId,
      stockSymbol,
      BigInt(quantity),
      BigInt(price),
      stockType.toLowerCase()
    )
    return res.status(200).json({
      message: `Sell order placed for ${quantity} '${stockType}' options at price ${price}.`,
    })
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'
    return res.status(400).json({ message: errorMessage })
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

    // Input validation
    if (
      !userId ||
      !stockSymbol ||
      !quantity ||
      !price ||
      !stockType ||
      !orderType
    ) {
      return res.status(400).json({ message: 'Missing required fields' })
    }
    if (isNaN(Number(quantity)) || isNaN(Number(price))) {
      return res
        .status(400)
        .json({ message: 'Quantity and Price must be valid numbers' })
    }

    await cancelOrder(
      userId,
      stockSymbol,
      BigInt(quantity),
      BigInt(price),
      stockType.toLowerCase(),
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
