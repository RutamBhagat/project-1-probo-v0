import { handleResetData } from '@/controllers/reset-controllers'
import { Router } from 'express'

const router = Router()

router.post('/', handleResetData)

export default router
