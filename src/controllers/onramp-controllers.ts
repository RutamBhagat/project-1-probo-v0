import { onrampUserBalance } from '@/services/onramp-services'
import { Request, Response } from 'express'

export const handleUserOnramp = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { userId, amount } = req.body
    await onrampUserBalance({ userId, balance: amount })
    res
      .status(200)
      .json({ message: `Onramped ${userId} with amount ${amount}` })
  } catch (error) {
    res.status(500).json({ error: 'Failed to clear database' })
  }
}
