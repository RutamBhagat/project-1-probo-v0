import { mintTokens } from '@/services/trade-services'
import { Request, Response } from 'express'

export const handleAddBalance = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { userId, amount } = req.body
    await mintTokens({ userId, amount })
    res
      .status(200)
      .json({ message: `Onramped ${userId} with amount ${amount}` })
  } catch (error) {
    res.status(500).json({ error: 'Failed to onramp money' })
  }
}
