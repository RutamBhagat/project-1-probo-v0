import { handleMintTokens } from '@/controllers/trade-controllers'
import { Router } from 'express'
import type { Tspec } from 'tspec'

const router = Router()

router.post('/mint', handleMintTokens)

type TradeResponse = {
  message: string
}

type ErrorResponse = {
  message: string
  details?: string
}

export type TradeApiSpec = Tspec.DefineApiSpec<{
  basePath: '/api/trade'
  tags: ['Trade']
  paths: {
    '/mint': {
      post: {
        summary: 'Mint tokens'
        handler: typeof handleMintTokens
        responses: {
          200: TradeResponse
          500: ErrorResponse
        }
      }
    }
  }
}>

export default router
