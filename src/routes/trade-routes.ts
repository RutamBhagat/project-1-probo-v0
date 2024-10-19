import { handleMintTokens } from '@/controllers/trade-controllers'
import { Router } from 'express'

const router = Router()

router.post('/mint', handleMintTokens)

export default router
