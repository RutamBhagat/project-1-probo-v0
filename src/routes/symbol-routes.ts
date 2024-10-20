import { handleCreateSymbol } from '@/controllers/symbol-controllers'
import { Router } from 'express'
import { Tspec } from 'tspec'

const router = Router()

router.post('/create/:id', handleCreateSymbol)

export type ApiSpec = Tspec.DefineApiSpec<{
  paths: {
    '/api/symbol/create/{id}': {
      post: {
        summary: 'Create a symbol by id'
        handler: typeof handleCreateSymbol
      }
    }
  }
}>

export default router
