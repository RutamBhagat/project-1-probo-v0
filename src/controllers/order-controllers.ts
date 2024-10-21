import {
  createBuyOrder,
  createSellOrder,
  cancelOrder,
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
  matchedPrice?: string // optional, included if an order matches
  remainingQuantity?: string // optional, for partial matches
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

    // Service call
    const { matchedPrice, remainingQuantity } = await createBuyOrder(
      userId,
      stockSymbol,
      BigInt(quantity),
      BigInt(price),
      stockType.toLowerCase()
    )

    // Handling response for full or partial match

    // If matched at exact price requested
    if (matchedPrice === null && remainingQuantity === BigInt(0)) {
      return res.status(200).json({
        message: 'Buy order placed and trade executed',
      })
    }

    // If matched at better price
    if (matchedPrice !== null && remainingQuantity === BigInt(0)) {
      return res.status(200).json({
        message: `Buy order matched at best price ${matchedPrice.toString()}`,
        matchedPrice: matchedPrice.toString(),
      })
    }

    // If no match found or partial match
    const msg = matchedPrice
      ? 'Buy order partially matched'
      : 'Buy order placed, but no match found'
    return res.status(200).json({
      message: msg,
      remainingQuantity: quantity,
    })
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error occurred'
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
