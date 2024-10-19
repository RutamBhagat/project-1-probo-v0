import { prisma } from '@/app'

export async function onrampUserBalance({
  userId,
  balance,
}: {
  userId: string
  balance: number
}) {
  const result = await prisma.inrBalance.create({
    data: {
      userId,
      balance,
    },
  })
  return result
}
