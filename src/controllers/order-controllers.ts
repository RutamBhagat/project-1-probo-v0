import {
  cancelOrder,
  createBuyOrder,
  createSellOrder,
  OrderStatus,
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
  status: OrderStatus
}

export const handleBuyOrder = async (
  req: Request<{}, {}, OrderRequestBody>,
  res: Response<OrderResponse>
) => {
  try {
    const { userId, stockSymbol, quantity, price, stockType } = req.body

    // Input validation
    if (!userId || !stockSymbol || !quantity || !price || !stockType) {
      return res.status(400).json({
        message: 'Missing required fields',
        status: OrderStatus.CANCELLED,
      })
    }
    if (isNaN(Number(quantity)) || isNaN(Number(price))) {
      return res.status(400).json({
        message: 'Quantity and Price must be valid numbers',
        status: OrderStatus.CANCELLED,
      })
    }

    // Service call to create buy order
    const { matchedPrice, remainingQuantity, status } = await createBuyOrder(
      userId,
      stockSymbol,
      BigInt(quantity),
      BigInt(price),
      stockType.toLowerCase()
    )

    let message: string

    switch (status) {
      case OrderStatus.FILLED:
        message = matchedPrice
          ? `Buy order fully matched at best price ${matchedPrice.toString()}`
          : 'Buy order fully executed at requested price'
        break
      case OrderStatus.PARTIALLY_FILLED:
        message = `Buy order partially matched, ${remainingQuantity.toString()} tokens remaining`
        break
      case OrderStatus.OPEN:
        message = 'Buy order placed and pending'
        break
      default:
        message = 'Unexpected order status'
    }

    return res.status(200).json({
      message,
      matchedPrice: matchedPrice?.toString(),
      remainingQuantity: remainingQuantity.toString(),
      status,
    })
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error occurred'
    console.error('Error handling buy order:', errorMessage)
    return res
      .status(400)
      .json({ message: errorMessage, status: OrderStatus.CANCELLED })
  }
}

type SellOrderResponse = {
  message: string
}

export const handleSellOrder = async (
  req: Request<{}, OrderResponse, OrderRequestBody>,
  res: Response<SellOrderResponse>
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

type CancelOrderResponse = {
  message: string
}

export const handleCancelOrder = async (
  req: Request<
    {},
    OrderResponse,
    OrderRequestBody & { orderType: 'BUY' | 'SELL' }
  >,
  res: Response<CancelOrderResponse>
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
