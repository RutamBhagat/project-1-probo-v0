import {
  handleBuyOrder,
  handleSellOrder,
} from '@/controllers/order-controllers'
import { Router } from 'express'

const router = Router()

router.post('/sell', handleSellOrder)
router.post('/buy', handleBuyOrder)

export default router
