import { prisma } from '@/app'

export async function createSymbol(
  id: string,
  expiryDate: Date,
  baseAsset: string,
  quoteAsset: string
) {
  const result = await prisma.symbol.create({
    data: {
      id,
      expiryDate,
      baseAsset,
      quoteAsset,
    },
  })
  return result
}
