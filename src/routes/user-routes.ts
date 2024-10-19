import { Router } from 'express'
import { prisma } from '../app'

const router = Router()

router.get(`/`, async (_req, res) => {
  const result = await prisma.user.findMany()
  res.json(result)
})

router.post(`/`, async (req, res) => {
  const { name, email } = req.body
  try {
    const result = await prisma.user.create({
      data: {
        name,
        email,
      },
    })
    res.json(result)
  } catch (e) {
    res.status(409).json({
      error: 'User already exists!',
    })
  }
})

export default router
