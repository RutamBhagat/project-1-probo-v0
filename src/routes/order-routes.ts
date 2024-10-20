import {
  handleBuyOrder,
  handleSellOrder,
} from '@/controllers/order-controllers'
import { Router } from 'express'
import { Tspec } from 'tspec'

const router = Router()

router.post('/sell', handleSellOrder)
router.post('/buy', handleBuyOrder)

export type ApiSpec = Tspec.DefineApiSpec<{
  paths: {
    '/api/order/sell': {
      post: {
        summary: 'Place a sell order'
        handler: typeof handleSellOrder
      }
    }
    '/api/order/buy': {
      post: {
        summary: 'Place a buy order'
        handler: typeof handleBuyOrder
      }
    }
  }
}>

export default router
