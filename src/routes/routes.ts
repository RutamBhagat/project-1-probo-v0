import { Router } from 'express'
import userRouter from '@/routes/user-routes'
import resetRouter from '@/routes/reset-routes'

const router = Router()

router.use('/user', userRouter)
router.use('/reset', resetRouter)

export default router
