import { Router } from 'express'
import userRouter from '@/routes/user-routes'
import resetRouter from '@/routes/reset-routes'
import onrampRouter from '@/routes/onramp-routes'

const router = Router()

router.use('/user', userRouter)
router.use('/reset', resetRouter)
router.use('/onramp', onrampRouter)

export default router
