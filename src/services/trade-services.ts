import { prisma } from '@/app'
import consola from 'consola'

export const mintTokens = async (
  userId: string,
  symbolId: string,
  quantity: bigint,
  price: bigint
) => {
  const totalCost = quantity * price

  try {
    // Check and update INR balance
    const inrBalance = await prisma.inrBalance.findUnique({
      where: { userId },
    })

    if (!inrBalance || inrBalance.balance < totalCost) {
      consola.warn(
        `User ${userId} has insufficient balance. Required: ${totalCost}, Available: ${
          inrBalance?.balance ?? 0
        }`
      )
      throw new Error('Insufficient balance')
    }

    // Log balance and cost
    consola.info(`User ${userId} has enough balance. Minting tokens...`)

    // Create token mint record
    await prisma.tokenMint.create({
      data: {
        userId,
        symbolId,
        quantity,
        price,
      },
    })

    // Create or update stock balances for both YES and NO tokens
    const tokenTypes = ['yes', 'no']
    for (const tokenType of tokenTypes) {
      await prisma.stockBalance.upsert({
        where: {
          userId_symbolId_tokenType: {
            userId,
            symbolId,
            tokenType,
          },
        },
        update: {
          quantity: {
            increment: quantity,
          },
        },
        create: {
          userId,
          symbolId,
          tokenType,
          quantity,
        },
      })

      // Log stock update
      consola.info(
        `Updated stock balance for ${tokenType} tokens for user ${userId}`
      )
    }

    // Update INR balance
    const updatedBalance = await prisma.inrBalance.update({
      where: { userId },
      data: {
        balance: {
          decrement: totalCost,
        },
      },
    })

    consola.success(
      `Tokens minted successfully. Remaining balance for user ${userId}: ${updatedBalance.balance}`
    )

    return updatedBalance.balance
  } catch (error) {
    // Log any error that occurs during minting
    consola.error(
      `Error during token minting process for user ${userId}:`,
      error
    )
    throw error // Re-throw the error to propagate it to the handler
  }
}
