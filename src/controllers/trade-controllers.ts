import { mintTokens } from '@/services/trade-services'
import { Request, Response } from 'express'

export const handleMintTokens = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { userId, stockSymbol, quantity, price } = req.body
    const remainingBalance = await mintTokens(
      userId,
      stockSymbol,
      BigInt(quantity),
      BigInt(price)
    )
    res.status(200).json({
      message: `Minted ${quantity} 'yes' and 'no' tokens for user ${userId}, remaining balance is ${remainingBalance}`,
    })
  } catch (error) {
    res.status(500).json({ error })
  }
}
