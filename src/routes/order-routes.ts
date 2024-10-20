import {
  handleBuyOrder,
  handleSellOrder,
} from '@/controllers/order-controllers'
import { Router } from 'express'
import type { Tspec } from 'tspec'

const router = Router()

router.post('/sell', handleSellOrder)
router.post('/buy', handleBuyOrder)

type OrderResponse = {
  message: string
}

export type OrderApiSpec = Tspec.DefineApiSpec<{
  basePath: '/api/order'
  tags: ['Order']
  paths: {
    '/sell': {
      post: {
        summary: 'Place a sell order'
        handler: typeof handleSellOrder
        responses: {
          200: OrderResponse
          500: OrderResponse
        }
      }
    }
    '/buy': {
      post: {
        summary: 'Place a buy order'
        handler: typeof handleBuyOrder
        responses: {
          200: OrderResponse
          500: OrderResponse
        }
      }
    }
  }
}>

export default router
