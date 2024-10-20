import {
  handleBuyOrder,
  handleSellOrder,
  handleCancelOrder,
  handleGetOrderBook,
} from '@/controllers/order-controllers'
import { Router } from 'express'
import type { Tspec } from 'tspec'

const router = Router()

router.post('/sell', handleSellOrder)
router.post('/buy', handleBuyOrder)
router.post('/cancel', handleCancelOrder)
router.get('/orderbook', handleGetOrderBook)

type OrderResponse = {
  message: string
}

type OrderBookResponse = Record<
  string,
  Record<
    string,
    Record<string, { total: string; orders: Record<string, string> }>
  >
>

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
    '/cancel': {
      post: {
        summary: 'Cancel an existing order'
        handler: typeof handleCancelOrder
        responses: {
          200: OrderResponse
          400: OrderResponse
        }
      }
    }
    '/orderbook': {
      get: {
        summary: 'Get the current order book'
        handler: typeof handleGetOrderBook
        responses: {
          200: OrderBookResponse
          500: OrderResponse
        }
      }
    }
  }
}>

export default router
