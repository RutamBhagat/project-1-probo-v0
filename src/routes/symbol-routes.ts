import { handleCreateSymbol } from '@/controllers/symbol-controllers'
import { Router } from 'express'
import type { Tspec } from 'tspec'

const router = Router()

router.post('/create/:id', handleCreateSymbol)

type SymbolResponse = {
  message: string
}

export type SymbolApiSpec = Tspec.DefineApiSpec<{
  basePath: '/api/symbol'
  tags: ['Symbol']
  paths: {
    '/create/{id}': {
      post: {
        summary: 'Create a symbol by id'
        handler: typeof handleCreateSymbol
        path: { id: string }
        responses: {
          201: SymbolResponse
          400: SymbolResponse
          500: SymbolResponse
        }
      }
    }
  }
}>

export default router
