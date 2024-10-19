import { Router } from 'express'
import { handleClearDatabase } from '../controllers/reset-controllers'

const router = Router()

router.post('/', handleClearDatabase)

export default router
