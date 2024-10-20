import {
  handleCreateUser,
  handleGetAllUsers,
} from '@/controllers/user-controllers'
import { Router } from 'express'
import type { Tspec } from 'tspec'

const router = Router()

router.get('/', handleGetAllUsers)
router.post('/create/:id', handleCreateUser)

type UserResponse = {
  message: string
}

export type UserApiSpec = Tspec.DefineApiSpec<{
  basePath: '/api/user'
  tags: ['User']
  paths: {
    '/': {
      get: {
        summary: 'Get all users'
        handler: typeof handleGetAllUsers
        responses: {
          200: UserResponse
          500: UserResponse
        }
      }
    }
    '/create/{id}': {
      post: {
        summary: 'Create a user by id'
        handler: typeof handleCreateUser
        path: { id: string }
        responses: {
          201: UserResponse
          409: UserResponse
          500: UserResponse
        }
      }
    }
  }
}>

export default router
