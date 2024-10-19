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
  const { id } = req.params
  try {
    await createUser(id)
    res.status(201).json({ message: `User ${id} created` })
  } catch (e) {
    res.status(409).json({
      error: 'User already exists!',
    })
  }
}
