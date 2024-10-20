import { handleResetData } from '@/controllers/reset-controllers'
import { Router } from 'express'
import type { Tspec } from 'tspec'

const router = Router()

router.post('/', handleResetData)

type ResetResponse = {
  message: string
}

export type ResetApiSpec = Tspec.DefineApiSpec<{
  basePath: '/api/reset'
  tags: ['Reset']
  paths: {
    '/': {
      post: {
        summary: 'Reset data'
        handler: typeof handleResetData
        responses: {
          200: ResetResponse
          500: ResetResponse
        }
      }
    }
  }
}>

export default router
