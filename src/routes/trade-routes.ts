import { handleMintTokens } from '@/controllers/trade-controllers'
import { Router } from 'express'
import { Tspec } from 'tspec'

const router = Router()

router.post('/mint', handleMintTokens)

export type TradeApiSpec = Tspec.DefineApiSpec<{
  paths: {
    '/api/trade/mint': {
      post: {
        summary: 'Mint tokens'
        handler: typeof handleMintTokens
      }
    }
  }
}>

export default router
