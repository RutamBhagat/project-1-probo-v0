import { prisma } from '@/app'

export const mintTokens = async (
  userId: string,
  symbolId: string,
  quantity: bigint,
  price: bigint
) => {
  const totalCost = quantity * price * BigInt(2) // Account for both "yes" and "no" tokens

  // Check and update INR balance
  const inrBalance = await prisma.inrBalance.findUnique({
    where: { userId },
  })

  if (!inrBalance || inrBalance.balance < totalCost) {
    throw new Error('Insufficient balance')
  }

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

  return updatedBalance.balance
}
