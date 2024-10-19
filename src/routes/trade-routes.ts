import { handleAddBalance } from '@/controllers/trade-controllers'
import { Router } from 'express'

const router = Router()

router.post('/mint', handleAddBalance)

export default router
