import { handleAddBalance } from '@/controllers/onramp-controllers'
import { Router } from 'express'

const router = Router()

router.post('/inr', handleAddBalance)

export default router
