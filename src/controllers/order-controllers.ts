import { createSellOrder } from '@/services/order-services'
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
