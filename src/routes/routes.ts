import { Router } from 'express'
import userRouter from '@/routes/user-routes'
import resetRouter from '@/routes/reset-routes'
import onrampRouter from '@/routes/onramp-routes'
import symbolRouter from '@/routes/symbol-routes'
import tradeRouter from '@/routes/trade-routes'
import orderRouter from '@/routes/order-routes'

const router = Router()

router.use('/user', userRouter)
router.use('/reset', resetRouter)
router.use('/onramp', onrampRouter)
router.use('/symbol', symbolRouter)
router.use('/trade', tradeRouter)
router.use('/order', orderRouter)

export default router
