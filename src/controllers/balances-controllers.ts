import type { Request, Response } from 'express'
import {
  getAllInrBalances,
  getAllStockBalances,
} from '@/services/balances-services'
import type { InrBalance } from '@prisma/client'
import type { StockBalance } from '@prisma/client'

type InrBalancesResponse = {
  [key: string]: { balance: number; locked: number }
}

// Define valid token types to avoid string indexing issues
type TokenType = 'yes' | 'no'

// Update type definitions to be more strict
type BalanceInfo = {
  quantity: number
  locked: number
}

type SymbolBalance = {
  yes: BalanceInfo
  no: BalanceInfo
}

type StockBalancesResponse = {
  [userId: string]: {
    [symbolId: string]: SymbolBalance
  }
}

type ErrorResponse = {
  message: string
}

export const handleGetStockBalances = async (req: Request, res: Response) => {
  try {
    const balances = await getAllStockBalances()
    const formattedBalances: StockBalancesResponse = {}

    balances.forEach((balance: StockBalance) => {
      const { userId, symbolId, tokenType, quantity, lockedQuantity } = balance

      // Validate tokenType
      if (tokenType !== 'yes' && tokenType !== 'no') {
        throw new Error(`Invalid token type: ${tokenType}`)
      }

      // Initialize nested objects if they don't exist
      if (!formattedBalances[userId]) {
        formattedBalances[userId] = {}
      }

      if (!formattedBalances[userId][symbolId]) {
        formattedBalances[userId][symbolId] = {
          yes: { quantity: 0, locked: 0 },
          no: { quantity: 0, locked: 0 },
        }
      }

      // Now TypeScript knows tokenType is 'yes' | 'no'
      formattedBalances[userId][symbolId][tokenType] = {
        quantity: Number(quantity),
        locked: Number(lockedQuantity),
      }
    })

    return res.status(200).json(formattedBalances)
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'
    return res.status(500).json({ message: errorMessage })
  }
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
