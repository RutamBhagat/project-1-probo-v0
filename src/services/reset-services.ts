import { prisma } from '../app'

export async function clearDatabase() {
  await prisma.user.deleteMany({})
  console.log('Deleted all rows from DB')
}
