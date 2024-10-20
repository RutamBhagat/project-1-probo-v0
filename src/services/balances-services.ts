import { prisma } from '@/app'

export const getAllInrBalances = async () => {
  return await prisma.inrBalance.findMany()
}
