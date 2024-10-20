import { prisma } from '@/app'
import type { User } from '@prisma/client'

export async function getAllUsers(): Promise<User[]> {
  const result = await prisma.user.findMany()
  return result
}

export async function createUser(userId: string): Promise<User> {
  const result = await prisma.user.create({
    data: {
      id: userId,
      inrBalance: {
        create: {},
      },
    },
  })
  return result
}
