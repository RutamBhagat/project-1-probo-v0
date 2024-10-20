import { addInrBalance } from '@/services/onramp-services'
import type { Request, Response } from 'express'

type OnrampRequestBody = {
  userId: string
  amount: string
}

type OnrampResponse = {
  message: string
}

export const handleOnrampInr = async (
  req: Request<{}, OnrampResponse, OnrampRequestBody>,
  res: Response<OnrampResponse>
): Promise<void> => {
  try {
    const { userId, amount } = req.body

    const amountBigInt = BigInt(amount)

    await addInrBalance(userId, amountBigInt)

    res.status(200).json({
      message: `Onramped ${userId} with amount ${amountBigInt.toString()}`,
    })
  } catch (error) {
    res.status(500).json({ message: 'Failed to onramp money' })
  }
}
