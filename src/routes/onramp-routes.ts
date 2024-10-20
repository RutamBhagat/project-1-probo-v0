import { handleOnrampInr } from '@/controllers/onramp-controllers'
import { Router } from 'express'
import { Tspec } from 'tspec'

const router = Router()

router.post('/inr', handleOnrampInr)

export type ApiSpec = Tspec.DefineApiSpec<{
  paths: {
    '/api/onramp/inr': {
      post: {
        summary: 'Onramp INR'
        handler: typeof handleOnrampInr
      }
    }
  }
}>

export default router
