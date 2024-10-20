// services.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export const getAllInrBalances = async () => {
  const balances = await prisma.inrBalance.findMany()

  // Format balances as per test requirements
  const formattedBalances: {
    [key: string]: { balance: number; locked: number }
  } = {}
  balances.forEach((balance) => {
    formattedBalances[balance.userId] = {
      balance: Number(balance.balance),
      locked: Number(balance.lockedBalance),
    }
  })

  return formattedBalances
}
