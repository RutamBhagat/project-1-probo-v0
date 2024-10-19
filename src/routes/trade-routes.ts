import { handleMintTokens } from '@/controllers/onramp-controllers'
import { Router } from 'express'

const router = Router()

router.post('/mint', handleMintTokens)

export default router
