import { prisma } from '@/app'
import { Symbol } from '@prisma/client'

export async function createSymbol(
  id: string,
  expiryDate: Date,
  baseAsset: string,
  quoteAsset: string
): Promise<Symbol> {
  try {
    const result = await prisma.symbol.create({
      data: {
        id,
        expiryDate,
        baseAsset,
        quoteAsset,
        status: 'active',
      },
    })
    return result
  } catch (error) {
    console.error('Symbol creation service error:', error)
    throw new Error('Failed to create symbol in database')
  }
}
