import { createUser, getAllUsers } from '@/services/user-services'
import type { User } from '@prisma/client'
import type { Request, Response } from 'express'

type UserResponse = {
  message: string
}

export const handleGetAllUsers = async (
  req: Request,
  res: Response<User[] | UserResponse>
) => {
  try {
    const result = await getAllUsers()
    res.json(result)
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'
    res.status(500).json({ message: errorMessage })
  }
}

export const handleCreateUser = async (
  req: Request<{ id: string }>,
  res: Response<UserResponse>
) => {
  const { id } = req.params
  try {
    await createUser(id)
    res.status(201).json({ message: `User ${id} created` })
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : 'Unknown error'
    res.status(409).json({ message: errorMessage })
  }
}
