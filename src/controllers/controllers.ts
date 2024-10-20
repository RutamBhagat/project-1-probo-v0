// controllers.ts
import { Request, Response } from 'express'
import * as service from '../services/services'

export const buyOrder = async (req: Request, res: Response) => {
  try {
    const { userId, stockSymbol, quantity, price, stockType } = req.body
    await service.createBuyOrder(
      userId,
      stockSymbol,
      BigInt(quantity),
      BigInt(price),
      stockType
    )
    return res
      .status(200)
      .json({ message: 'Buy order placed and trade executed' })
  } catch (error) {
    return res.status(500).json({ error })
  }
}

export const getInrBalances = async (req: Request, res: Response) => {
  try {
    const balances = await service.getAllInrBalances()
    return res.status(200).json(balances)
  } catch (error) {
    return res.status(500).json({ error })
  }
}
