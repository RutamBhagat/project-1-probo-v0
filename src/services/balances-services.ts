import { prisma } from '@/app'
import type { InrBalance } from '@prisma/client'

export const getAllInrBalances = async (): Promise<InrBalance[]> => {
  const result = await prisma.inrBalance.findMany()
  return result
}
