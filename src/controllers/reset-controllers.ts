import { resetDatabase } from '@/services/reset-services'
import { Request, Response } from 'express'

export const handleResetData = async (req: Request, res: Response) => {
  try {
    await resetDatabase()
    return res.status(200).json({ message: 'Database reset successful' })
  } catch (error) {
    return res.status(500).json({ error })
  }
}
