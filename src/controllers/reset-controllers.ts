import { resetDatabase } from '@/services/reset-services'
import type { Request, Response } from 'express'

type ResetResponse = {
  message: string
}

export const handleResetData = async (
  req: Request,
  res: Response<ResetResponse>
) => {
  try {
    await resetDatabase()
    return res.status(200).json({ message: 'Database reset successful' })
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'
    return res.status(500).json({ message: errorMessage })
  }
}
