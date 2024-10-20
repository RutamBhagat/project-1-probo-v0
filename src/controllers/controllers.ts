// controllers.ts
import { Request, Response } from 'express'
import * as service from '@/services/services'

export const getInrBalances = async (req: Request, res: Response) => {
  try {
    const balances = await service.getAllInrBalances()
    return res.status(200).json(balances)
  } catch (error) {
    return res.status(500).json({ error })
  }
}
