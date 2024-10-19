import { handleUserOnramp } from '@/controllers/onramp-controllers'
import { Router } from 'express'

const router = Router()

router.post('/inr', handleUserOnramp)

export default router
