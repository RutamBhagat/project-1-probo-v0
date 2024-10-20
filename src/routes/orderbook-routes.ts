import { handleGetOrderBook } from '@/controllers/orderbook-controllers'
import { Router } from 'express'
import type { Tspec } from 'tspec'

const router = Router()

router.get('/', handleGetOrderBook)

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

export type OrderBookApiSpec = Tspec.DefineApiSpec<{
  basePath: '/api/orderbook'
  tags: ['Order']
  paths: {
    '/': {
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
