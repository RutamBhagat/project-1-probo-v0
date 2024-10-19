import { prisma } from '@/app'

export async function getAllUsers() {
  const result = await prisma.user.findMany()
  return result
}

export async function createUser(id: string) {
  const result = await prisma.user.create({
    data: {
      id,
    },
  })
  return result
}
