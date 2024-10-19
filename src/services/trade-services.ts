import { prisma } from '@/app'

export async function addBalance({
  userId,
  amount,
}: {
  userId: string
  amount: number
}) {
  const result = await prisma.inrBalance.create({
    data: {
      userId,
      balance: amount,
    },
  })
  return result
}
