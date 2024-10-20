import { handleGetInrBalances } from '@/controllers/balances-controllers'
import { Router } from 'express'
import type { Tspec } from 'tspec'

const router = Router()

router.get('/inr', handleGetInrBalances)

type InrBalancesResponse = {
  [key: string]: { balance: number; locked: number }
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
  }
}>

export default router
