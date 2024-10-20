import { handleOnrampInr } from '@/controllers/onramp-controllers'
import { Router } from 'express'
import type { Tspec } from 'tspec'

const router = Router()

router.post('/inr', handleOnrampInr)

type OnrampResponse = {
  message: string
}

export type OnrampApiSpec = Tspec.DefineApiSpec<{
  basePath: '/api/onramp'
  tags: ['Onramp']
  paths: {
    '/inr': {
      post: {
        summary: 'Onramp INR'
        handler: typeof handleOnrampInr
        responses: {
          200: OnrampResponse
          500: OnrampResponse
        }
      }
    }
  }
}>

export default router
