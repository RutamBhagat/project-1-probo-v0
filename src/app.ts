import { PrismaClient } from '@prisma/client'
import express from 'express'
import baseRouter from '@/routes/routes'
import { TspecDocsMiddleware } from 'tspec'

export const prisma = new PrismaClient()
export const app = express()

app.use(express.json())
app.use('/api', baseRouter)
app.use('/api-docs', await TspecDocsMiddleware())

app.use('*', (req, res) => {
  res.status(404).json({
    message: 'Not found',
  })
})
