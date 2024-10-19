import { createUser, getAllUsers } from '@/services/user-services'
import { Request, Response } from 'express'

export const handleGetAllUsers = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const result = await getAllUsers()
    res.json(result)
  } catch (error) {
    res.status(500).json({ error: 'Failed to clear database' })
  }
}

export const handleCreateUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { userId } = req.params
  try {
    const result = await createUser(userId)
    res.json(result)
  } catch (e) {
    res.status(409).json({
      error: 'User already exists!',
    })
  }
}
