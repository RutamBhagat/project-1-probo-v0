import request from 'supertest'
import { app, prisma } from '@/app'
import { beforeAll, afterAll, describe, expect, it } from 'vitest'

describe('E-to-E-3', () => {
  beforeAll(async () => {
    await request(app).post('/api/reset') // Reset the data values
  })

  it('should handle multiple matching orders and price priorities correctly', async () => {
    // Step 1: Create users (User1 and User2)
    let response = await request(app).post('/api/user/create/user1')
    expect(response.status).toBe(201)
    expect(response.body.message).toBe('User user1 created')

    response = await request(app).post('/api/user/create/user2')
    expect(response.status).toBe(201)
    expect(response.body.message).toBe('User user2 created')

    // Step 2: Create a symbol
    response = await request(app).post(
      '/api/symbol/create/ETH_USD_15_Oct_2024_12_00'
    )
    expect(response.status).toBe(201)
    expect(response.body.message).toBe(
      'Symbol ETH_USD_15_Oct_2024_12_00 created'
    )

    // Step 3: Add balance to users
    await request(app)
      .post('/api/onramp/inr')
      .send({ userId: 'user1', amount: 500000 })
    await request(app)
      .post('/api/onramp/inr')
      .send({ userId: 'user2', amount: 300000 })

    // Check INR balances after adding funds
    response = await request(app).get('/api/balances/inr')
    expect(response.status).toBe(200)
    expect(response.body['user1']).toEqual({ balance: 500000, locked: 0 })
    expect(response.body['user2']).toEqual({ balance: 300000, locked: 0 })

    // Step 4: Mint tokens for User1
    response = await request(app).post('/api/trade/mint').send({
      userId: 'user1',
      stockSymbol: 'ETH_USD_15_Oct_2024_12_00',
      quantity: 200,
      price: 1500,
    })
    expect(response.status).toBe(200)
    expect(response.body.message).toBe(
      "Minted 200 'yes' and 'no' tokens for user user1, remaining balance is 200000"
    )

    // Insufficient INR Balance for User2 when placing buy order
    response = await request(app).post('/api/order/buy').send({
      userId: 'user2',
      stockSymbol: 'ETH_USD_15_Oct_2024_12_00',
      quantity: 500,
      price: 1500,
      stockType: 'yes',
    })
    expect(response.status).toBe(400)
    expect(response.body.message).toBe('Insufficient INR balance')

    // Step 5: User1 places multiple sell orders at different prices
    await request(app).post('/api/order/sell').send({
      userId: 'user1',
      stockSymbol: 'ETH_USD_15_Oct_2024_12_00',
      quantity: 100,
      price: 1400,
      stockType: 'yes',
    })

    await request(app).post('/api/order/sell').send({
      userId: 'user1',
      stockSymbol: 'ETH_USD_15_Oct_2024_12_00',
      quantity: 50, // Changed from 100 to 50
      price: 1500,
      stockType: 'yes',
    })

    // Insufficient Stock Balance for User1 when placing a sell order
    response = await request(app).post('/api/order/sell').send({
      userId: 'user1',
      stockSymbol: 'ETH_USD_15_Oct_2024_12_00',
      quantity: 300,
      price: 1500,
      stockType: 'yes',
    })
    expect(response.status).toBe(400)
    expect(response.body.message).toBe('Insufficient stock balance')

    // Check order book after placing multiple sell orders
    response = await request(app).get('/api/orderbook')
    expect(response.status).toBe(200)
    expect(response.body['ETH_USD_15_Oct_2024_12_00']['yes']).toEqual({
      1400: { total: 100, orders: { user1: 100 } },
      1500: { total: 50, orders: { user1: 50 } }, // Updated expectation
    })

    // Step 6: Check stock locking after placing sell orders
    response = await request(app).get('/api/balances/stock')
    expect(response.status).toBe(200)
    expect(response.body['user1']['ETH_USD_15_Oct_2024_12_00']['yes']).toEqual({
      quantity: 50, // 200 minted - 150 locked
      locked: 150,
    })

    // Step 7: User2 places a buy order for 100 tokens, should match the lower price first (1400)
    response = await request(app).post('/api/order/buy').send({
      userId: 'user2',
      stockSymbol: 'ETH_USD_15_Oct_2024_12_00',
      quantity: 100,
      price: 1500,
      stockType: 'yes',
    })
    expect(response.status).toBe(200)
    expect(response.body.message).toBe('Buy order matched at best price 1400')

    // Check INR balances after matching the order
    response = await request(app).get('/api/balances/inr')
    expect(response.status).toBe(200)
    expect(response.body['user2']).toEqual({ balance: 160000, locked: 0 })

    // Step 8: Verify stock balances after matching
    response = await request(app).get('/api/balances/stock')
    expect(response.status).toBe(200)
    expect(response.body['user1']['ETH_USD_15_Oct_2024_12_00']['yes']).toEqual({
      quantity: 50,
      locked: 50,
    })
    expect(response.body['user2']['ETH_USD_15_Oct_2024_12_00']['yes']).toEqual({
      quantity: 100,
      locked: 0,
    })

    // Additional onramp for user2
    await request(app)
      .post('/api/onramp/inr')
      .send({ userId: 'user2', amount: 200000 })

    // Verify updated balance for user2
    response = await request(app).get('/api/balances/inr')
    expect(response.status).toBe(200)
    expect(response.body['user2']).toEqual({ balance: 360000, locked: 0 })

    // Step 9: User2 places a buy order for 75 tokens, should partially match
    response = await request(app).post('/api/order/buy').send({
      userId: 'user2',
      stockSymbol: 'ETH_USD_15_Oct_2024_12_00',
      quantity: 75,
      price: 1500,
      stockType: 'yes',
    })
    expect(response.status).toBe(200)
    expect(response.body.message).toBe(
      'Buy order partially matched, 25 tokens remaining'
    )

    // Check INR balances after partial matching
    response = await request(app).get('/api/balances/inr')
    expect(response.status).toBe(200)
    expect(response.body['user2']).toEqual({ balance: 285000, locked: 37500 }) // 360000 - (50 * 1500) - (25 * 1500)
    expect(response.body['user1']).toEqual({ balance: 350000, locked: 0 }) // 200000 + (100 * 1400) + (50 * 1500)

    // Check order book after partial matching
    response = await request(app).get('/api/orderbook')
    expect(response.status).toBe(200)
    expect(response.body['ETH_USD_15_Oct_2024_12_00']['yes']).toEqual({
      1500: { total: 25, orders: { user2: 25 } },
    })

    // Step 10: Verify stock balances after matching
    response = await request(app).get('/api/balances/stock')
    expect(response.status).toBe(200)
    expect(response.body['user1']['ETH_USD_15_Oct_2024_12_00']['yes']).toEqual({
      quantity: 50,
      locked: 0,
    })
    expect(response.body['user2']['ETH_USD_15_Oct_2024_12_00']['yes']).toEqual({
      quantity: 150,
      locked: 0,
    })

    // Final INR balance check
    response = await request(app).get('/api/balances/inr')
    expect(response.status).toBe(200)
    expect(response.body['user1']).toEqual({ balance: 350000, locked: 0 })
    expect(response.body['user2']).toEqual({ balance: 285000, locked: 37500 })
  })

  it('should handle multiple buy orders with price priority matching', async () => {
    // Reset data and start fresh
    await request(app).post('/api/reset')

    // Step 1: Create users (User1 and User2)
    await request(app).post('/api/user/create/user1')
    await request(app).post('/api/user/create/user2')

    // Step 2: Add balance to users
    await request(app)
      .post('/api/onramp/inr')
      .send({ userId: 'user1', amount: 500000 })
    await request(app)
      .post('/api/onramp/inr')
      .send({ userId: 'user2', amount: 300000 })

    // Step 3: Create a symbol and mint tokens for User1
    await request(app).post('/api/symbol/create/ETH_USD_15_Oct_2024_12_00')
    await request(app).post('/api/trade/mint').send({
      userId: 'user1',
      stockSymbol: 'ETH_USD_15_Oct_2024_12_00',
      quantity: 200,
      price: 1500,
    })

    // Add stock balance check here
    let response = await request(app).get('/api/balances/stock')
    expect(response.status).toBe(200)
    expect(response.body['user1']['ETH_USD_15_Oct_2024_12_00']['yes']).toEqual({
      quantity: 200,
      locked: 0,
    })

    // Step 4: User1 places sell orders at two different prices
    await request(app).post('/api/order/sell').send({
      userId: 'user1',
      stockSymbol: 'ETH_USD_15_Oct_2024_12_00',
      quantity: 100,
      price: 1400,
      stockType: 'yes',
    })

    await request(app).post('/api/order/sell').send({
      userId: 'user1',
      stockSymbol: 'ETH_USD_15_Oct_2024_12_00',
      quantity: 100,
      price: 1500,
      stockType: 'yes',
    })

    response = await request(app).get('/api/balances/stock')
    expect(response.status).toBe(200)
    expect(response.body['user1']['ETH_USD_15_Oct_2024_12_00']['yes']).toEqual({
      quantity: 0,
      locked: 200,
    })

    // Step 5: User2 places a buy order with a price lower than the lowest sell price
    response = await request(app).post('/api/order/buy').send({
      userId: 'user2',
      stockSymbol: 'ETH_USD_15_Oct_2024_12_00',
      quantity: 50,
      price: 1300,
      stockType: 'yes',
    })
    expect(response.status).toBe(200)
    expect(response.body.message).toBe('Buy order placed and pending')

    response = await request(app).get('/api/balances/inr')
    expect(response.status).toBe(200)
    expect(response.body['user2']).toEqual({
      balance: 235000,
      locked: 65000,
    })

    // Check the order book and ensure no matching has occurred
    response = await request(app).get('/api/orderbook')
    expect(response.status).toBe(200)
    expect(response.body['ETH_USD_15_Oct_2024_12_00']['yes']).toEqual({
      1400: { total: 100, orders: { user1: 100 } },
      1500: { total: 100, orders: { user1: 100 } },
    })

    response = await request(app).get('/api/balances/stock')
    expect(response.status).toBe(200)
    expect(response.body['user1']['ETH_USD_15_Oct_2024_12_00']['yes']).toEqual({
      quantity: 0,
      locked: 200,
    })

    // Step 6: User2 places another buy order at a higher price
    response = await request(app).post('/api/order/buy').send({
      userId: 'user2',
      stockSymbol: 'ETH_USD_15_Oct_2024_12_00',
      quantity: 75,
      price: 1450,
      stockType: 'yes',
    })
    expect(response.status).toBe(200)
    expect(response.body.message).toBe('Buy order matched at price 1400')

    // Verify that the order book is updated correctly
    response = await request(app).get('/api/orderbook')
    expect(response.status).toBe(200)
    expect(response.body['ETH_USD_15_Oct_2024_12_00']['yes']).toEqual({
      1300: { total: 50, orders: { user2: 50 } },
      1400: { total: 25, orders: { user1: 25 } },
      1500: { total: 100, orders: { user1: 100 } },
    })

    // Verify stock balances
    response = await request(app).get('/api/balances/stock')
    expect(response.status).toBe(200)
    expect(response.body['user1']['ETH_USD_15_Oct_2024_12_00']['yes']).toEqual({
      quantity: 0,
      locked: 125,
    })
    expect(response.body['user2']['ETH_USD_15_Oct_2024_12_00']['yes']).toEqual({
      quantity: 75,
      locked: 0,
    })

    // Verify INR balances
    response = await request(app).get('/api/balances/inr')
    expect(response.status).toBe(200)
    expect(response.body['user1']).toEqual({ balance: 305000, locked: 0 })
    expect(response.body['user2']).toEqual({ balance: 126250, locked: 65000 })
  })
})
