import { handleSellOrder } from '@/controllers/order-controllers'
import { Router } from 'express'

const router = Router()

router.post('/sell', handleSellOrder)

export default router
