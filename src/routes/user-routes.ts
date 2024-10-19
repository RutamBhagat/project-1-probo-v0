import {
  handleCreateUser,
  handleGetAllUsers,
} from '@/controllers/user-controllers'
import { Router } from 'express'

const router = Router()

router.get('/', handleGetAllUsers)

router.post('/create/:userId', handleCreateUser)

export default router
