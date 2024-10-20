import type { Request, Response } from 'express'
import { getAllInrBalances } from '@/services/balances-services'
import type { InrBalance } from '@prisma/client'

type InrBalancesResponse = {
  [key: string]: { balance: number; locked: number }
}

type ErrorResponse = {
  message: string
}

export const handleGetInrBalances = async (
  req: Request,
  res: Response<InrBalancesResponse | ErrorResponse>
) => {
  try {
    const balances = await getAllInrBalances()

    const formattedBalances: InrBalancesResponse = {}

    balances.forEach((balance: InrBalance) => {
      formattedBalances[balance.userId] = {
        balance: Number(balance.balance),
        locked: Number(balance.lockedBalance),
      }
    })

    return res.status(200).json(formattedBalances)
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'
    return res.status(500).json({ message: errorMessage })
  }
}
