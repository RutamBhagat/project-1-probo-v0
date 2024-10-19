import { handleCreateSymbol } from '@/controllers/symbol-controllers'
import { Router } from 'express'

const router = Router()

router.post('/create/:id', handleCreateSymbol)

export default router
