import { handleGetInrBalances } from '@/controllers/balances-controllers'
import { Router } from 'express'
import { Tspec } from 'tspec'

const router = Router()

router.get('/inr', handleGetInrBalances)

export type BalancesApiSpec = Tspec.DefineApiSpec<{
  paths: {
    '/api/balances/inr': {
      get: {
        summary: 'Get INR balances'
        handler: typeof handleGetInrBalances
      }
    }
  }
}>

export default router
