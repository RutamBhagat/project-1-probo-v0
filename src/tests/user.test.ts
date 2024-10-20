import request from 'supertest'
import { app, prisma } from '@/app'

afterAll(async () => {
  await prisma.$disconnect()
})

test('a user is added successfully', async () => {
  const response = await request(app)
    .post('/api/user/create/user_1')
    .send()
    .set('Accept', 'application/json')
    .expect('Content-Type', /json/)
    .expect(201)

  expect(response.body.message).toBeDefined()
})

test('a user with the same userId is rejected', () => {
  return request(app)
    .post('/api/user/create/user_1')
    .send()
    .set('Accept', 'application/json')
    .expect('Content-Type', /json/)
    .expect(409)
})

test('correct list of users returned', async () => {
  const response = await request(app)
    .get('/api/user')
    .expect('Content-Type', /json/)
    .expect(200)

  expect(response.body).toBeDefined()
  expect(response.body.length).toEqual(1)
})
