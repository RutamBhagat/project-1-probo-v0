import { PrismaClient } from '@prisma/client'
import process from 'node:process'
import express from 'express'
import baseRouter from '@/routes/routes'
import { TspecDocsMiddleware } from 'tspec'

export const prisma = new PrismaClient()
export const app = express()

app.use(express.json())

app.get('/', (_req, res) => {
  res.json({
    message: 'Welcome to the API!',
  })
})

app.get('/healthcheck', (_req, res) => {
  res.json({
    message: 'Server is running',
    uptime: process.uptime(),
    timestamp: Date.now(),
  })
})

app.use('/api-docs', await TspecDocsMiddleware())
app.use('/api', baseRouter)

app.use('*', (req, res) => {
  res.status(404).json({
    message: 'Not found',
  })
})
