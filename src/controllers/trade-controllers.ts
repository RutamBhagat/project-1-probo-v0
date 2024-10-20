import { mintTokens } from '@/services/trade-services'
import type { Request, Response } from 'express'
import consola from 'consola'

type TradeRequestBody = {
  userId: string
  stockSymbol: string
  quantity: string
  price: string
}

type TradeResponse = {
  message: string
}

type ErrorResponse = {
  message: string
  details?: string
}

export const handleMintTokens = async (
  req: Request<{}, TradeResponse | ErrorResponse, TradeRequestBody>,
  res: Response<TradeResponse | ErrorResponse>
) => {
  try {
    const { userId, stockSymbol, quantity, price } = req.body

    // Log input values
    consola.info(
      `Mint request received for user: ${userId}, symbol: ${stockSymbol}, quantity: ${quantity}, price: ${price}`
    )

    const remainingBalance = await mintTokens(
      userId,
      stockSymbol,
      BigInt(quantity),
      BigInt(price)
    )

    // Log successful minting
    consola.success(
      `Successfully minted ${quantity} 'yes' and 'no' tokens for user ${userId}`
    )

    res.status(200).json({
      message: `Minted ${quantity} 'yes' and 'no' tokens for user ${userId}, remaining balance is ${remainingBalance}`,
    })
  } catch (error) {
    // Log the error with additional details
    consola.error(`Error minting tokens for user ${req.body.userId}:`, error)

    // Send detailed error response
    res.status(500).json({
      message: 'An error occurred while minting tokens',
      details: error instanceof Error ? error.message : undefined,
    })
  }
}
