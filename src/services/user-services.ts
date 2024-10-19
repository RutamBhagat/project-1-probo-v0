import { prisma } from '@/app'

export async function getAllUsers() {
  const result = await prisma.user.findMany()
  return result
}

export async function createUser(userId: string) {
  const result = await prisma.user.create({
    data: {
      userId,
    },
  })
  return result
}
