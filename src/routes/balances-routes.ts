import {
  handleGetInrBalances,
  handleGetStockBalances,
} from '@/controllers/balances-controllers'
import { Router } from 'express'
import type { Tspec } from 'tspec'

const router = Router()

router.get('/inr', handleGetInrBalances)
router.get('/stock', handleGetStockBalances)

type InrBalancesResponse = {
  [key: string]: { balance: number; locked: number }
}

type StockBalancesResponse = {
  [userId: string]: {
    [symbol: string]: {
      yes: { quantity: number; locked: number }
      no: { quantity: number; locked: number }
    }
  }
}

export type BalancesApiSpec = Tspec.DefineApiSpec<{
  basePath: '/api/balances'
  tags: ['Balances']
  paths: {
    '/inr': {
      get: {
        summary: 'Get INR balances'
        handler: typeof handleGetInrBalances
        responses: {
          200: InrBalancesResponse
          500: { message: string }
        }
      }
    }
    '/stock': {
      get: {
        summary: 'Get Stock balances'
        handler: typeof handleGetStockBalances
        responses: {
          200: StockBalancesResponse
          500: { message: string }
        }
      }
    }
  }
}>

export default router
