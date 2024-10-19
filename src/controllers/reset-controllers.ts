import { Request, Response } from 'express'
import { clearDatabase } from '../services/reset-services'

export const handleClearDatabase = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    await clearDatabase()
    res.status(200).json({ message: 'Database cleared successfully' })
  } catch (error) {
    res.status(500).json({ error: 'Failed to clear database' })
  }
}
