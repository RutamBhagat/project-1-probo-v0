import { prisma } from '@/app'

export const addInrBalance = async (userId: string, amount: bigint) => {
  await prisma.inrTransaction.create({
    data: {
      userId,
      amount,
      transactionType: 'DEPOSIT',
    },
  })

  await prisma.inrBalance.update({
    where: { userId },
    data: {
      balance: {
        increment: amount,
      },
    },
  })
}
