import {
  handleCreateUser,
  handleGetAllUsers,
} from '@/controllers/user-controllers'
import { Router } from 'express'
import { Tspec } from 'tspec'

const router = Router()

router.get('/', handleGetAllUsers)
router.post('/create/:id', handleCreateUser)

export type ApiSpec = Tspec.DefineApiSpec<{
  paths: {
    '/api/user': {
      get: {
        summary: 'Get all users'
        handler: typeof handleGetAllUsers
      }
    }
    '/api/user/create/{id}': {
      post: {
        summary: 'Create a user by id'
        handler: typeof handleCreateUser
      }
    }
  }
}>

export default router
