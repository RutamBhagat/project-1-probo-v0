import { prisma } from '@/app'

export const resetDatabase = async () => {
  // Delete all records in reverse order of dependencies
  await prisma.trade.deleteMany()
  await prisma.order.deleteMany()
  await prisma.stockBalance.deleteMany()
  await prisma.inrTransaction.deleteMany()
  await prisma.inrBalance.deleteMany()
  await prisma.tokenMint.deleteMany()
  await prisma.symbol.deleteMany()
  await prisma.user.deleteMany()
}
