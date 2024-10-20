import { handleResetData } from '@/controllers/reset-controllers'
import { Router } from 'express'
import { Tspec } from 'tspec'

const router = Router()

router.post('/', handleResetData)

export type ApiSpec = Tspec.DefineApiSpec<{
  paths: {
    '/api/reset': {
      post: {
        summary: 'Reset data'
        handler: typeof handleResetData
      }
    }
  }
}>

export default router
