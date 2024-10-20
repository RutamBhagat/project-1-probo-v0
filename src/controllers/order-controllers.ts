import { createBuyOrder, createSellOrder } from '@/services/order-services'
import { Request, Response } from 'express'

export const handleSellOrder = async (req: Request, res: Response) => {
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
    return res.status(500).json({ error })
  }
}

export const handleBuyOrder = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { userId, stockSymbol, quantity, price, stockType } = req.body

    if (!userId || !stockSymbol || !quantity || !price || !stockType) {
      res.status(400).json({ error: 'Missing required fields' })
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
    console.error('Buy order error:', error)
    res.status(500).json({ error })
  }
}
