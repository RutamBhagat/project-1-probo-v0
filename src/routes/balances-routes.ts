import { handleGetInrBalances } from '@/controllers/balances-controllers'
import { Router } from 'express'

const router = Router()

router.get('/inr', handleGetInrBalances)

export default router
