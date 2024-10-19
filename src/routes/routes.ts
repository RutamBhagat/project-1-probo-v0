import { Router } from 'express'
import userRouter from './user-routes'
import resetRouter from './reset-routes'

const router = Router()

router.use('/user', userRouter)
router.use('/reset', resetRouter)

export default router
