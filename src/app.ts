import { PrismaClient } from '@prisma/client'
import express from 'express'
import baseRouter from './routes/routes'

export const prisma = new PrismaClient()
export const app = express()

app.use(express.json())

app.use('/api', baseRouter)
