import { prisma } from '@/app'
import type { InrBalance, StockBalance } from '@prisma/client'

export const getAllInrBalances = async (): Promise<InrBalance[]> => {
  const result = await prisma.inrBalance.findMany()
  return result
}

export const getAllStockBalances = async (): Promise<StockBalance[]> => {
  const result = await prisma.stockBalance.findMany()
  return result
}
