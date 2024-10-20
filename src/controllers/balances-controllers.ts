import { getAllInrBalances } from '@/services/balances-services'
import { Request, Response } from 'express'

export const handleGetInrBalances = async (req: Request, res: Response) => {
  try {
    const balances = await getAllInrBalances()

    const formattedBalances: {
      [key: string]: { balance: number; locked: number }
    } = {}

    balances.forEach((balance) => {
      formattedBalances[balance.userId] = {
        balance: Number(balance.balance),
        locked: Number(balance.lockedBalance),
      }
    })

    return res.status(200).json(formattedBalances)
  } catch (error) {
    return res.status(500).json({ error })
  }
}
