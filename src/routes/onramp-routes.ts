import { handleOnrampInr } from '@/controllers/onramp-controllers'
import { Router } from 'express'

const router = Router()

router.post('/inr', handleOnrampInr)

export default router
