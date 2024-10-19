import { prisma } from '@/app'

export async function getAllUsers() {
  const result = await prisma.user.findMany()
  return result
}

export const createUser = async (userId: string) => {
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
