import { handleClearDatabase } from '@/controllers/reset-controllers'
import { Router } from 'express'

const router = Router()

router.post('/', handleClearDatabase)

export default router
