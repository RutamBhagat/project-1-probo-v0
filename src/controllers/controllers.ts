// controllers.ts
import { Request, Response } from 'express'
import * as service from '../services/services'

export const createSymbol = async (req: Request, res: Response) => {
  try {
    const symbolId = req.params.symbolId
    await service.createSymbol(symbolId)
    return res.status(201).json({ message: `Symbol ${symbolId} created` })
  } catch (error) {
    return res.status(500).json({ error })
  }
}

export const mintTokens = async (req: Request, res: Response) => {
  try {
    const { userId, stockSymbol, quantity, price } = req.body
    const remainingBalance = await service.mintTokens(
      userId,
      stockSymbol,
      BigInt(quantity),
      BigInt(price)
    )
    return res.status(200).json({
      message: `Minted ${quantity} 'yes' and 'no' tokens for user ${userId}, remaining balance is ${remainingBalance}`,
    })
  } catch (error) {
    return res.status(500).json({ error })
  }
}

export const sellOrder = async (req: Request, res: Response) => {
  try {
    const { userId, stockSymbol, quantity, price, stockType } = req.body
    await service.createSellOrder(
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

export const resetData = async (req: Request, res: Response) => {
  try {
    await service.resetDatabase()
    return res.status(200).json({ message: 'Database reset successful' })
  } catch (error) {
    return res.status(500).json({ error })
  }
}