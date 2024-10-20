import { prisma } from '@/app'

export async function createBuyOrder(
  userId: string,
  symbolId: string,
  quantity: bigint,
  price: bigint,
  tokenType: string
): Promise<bigint | null> {
  // Return matched price or null
  return await prisma.$transaction(async (prisma) => {
    const totalCost = quantity * price
    const buyerBalance = await prisma.inrBalance.findUnique({
      where: { userId },
    })

    if (!buyerBalance || buyerBalance.balance < totalCost) {
      throw new Error('Insufficient INR balance')
    }

    // Lock buyer's funds
    await prisma.inrBalance.update({
      where: { userId },
      data: {
        balance: { decrement: totalCost },
        lockedBalance: { increment: totalCost },
      },
    })

    // Create buy order
    const buyOrder = await prisma.order.create({
      data: {
        userId,
        symbolId,
        orderType: 'BUY',
        tokenType,
        quantity,
        remainingQuantity: quantity,
        price,
        status: 'OPEN',
      },
    })

    let remainingBuyQuantity = quantity
    let matchedPrice: bigint | null = null

    // Find and match sell orders, sorted by price (lowest first)
    const matchingSellOrders = await prisma.order.findMany({
      where: {
        symbolId,
        tokenType,
        orderType: 'SELL',
        status: 'OPEN',
        price: {
          lte: price, // Only match sell orders with price <= buy price
        },
      },
      orderBy: [{ price: 'asc' }, { createdAt: 'asc' }], // Prioritize by price and then time
    })

    for (const sellOrder of matchingSellOrders) {
      if (remainingBuyQuantity === BigInt(0)) {
        break // Stop if buy order is fully matched
      }

      const tradeQuantity =
        sellOrder.remainingQuantity < remainingBuyQuantity
          ? sellOrder.remainingQuantity
          : remainingBuyQuantity // Match the smaller quantity

      const tradeValue = tradeQuantity * sellOrder.price

      // Create the trade
      await prisma.trade.create({
        data: {
          symbolId,
          tokenType,
          buyerId: userId,
          sellerId: sellOrder.userId,
          buyerOrderId: buyOrder.id,
          sellerOrderId: sellOrder.id,
          quantity: tradeQuantity,
          price: sellOrder.price,
        },
      })

      // Update seller's locked tokens and balance
      await prisma.stockBalance.update({
        where: {
          userId_symbolId_tokenType: {
            userId: sellOrder.userId,
            symbolId,
            tokenType,
          },
        },
        data: {
          lockedQuantity: { decrement: tradeQuantity },
        },
      })

      await prisma.inrBalance.update({
        where: { userId: sellOrder.userId },
        data: {
          balance: { increment: tradeValue },
        },
      })

      // Update buyer's token balance
      await prisma.stockBalance.upsert({
        where: {
          userId_symbolId_tokenType: {
            userId,
            symbolId,
            tokenType,
          },
        },
        update: { quantity: { increment: tradeQuantity } },
        create: { userId, symbolId, tokenType, quantity: tradeQuantity },
      })

      // Refund excess if needed (buyer paid a higher price but matched a lower price)
      const refundAmount = tradeQuantity * (price - sellOrder.price)
      await prisma.inrBalance.update({
        where: { userId },
        data: {
          lockedBalance: { decrement: tradeValue + refundAmount },
          balance: { increment: refundAmount },
        },
      })

      // Update the sell order's remaining quantity and status
      await prisma.order.update({
        where: { id: sellOrder.id },
        data: {
          remainingQuantity: { decrement: tradeQuantity },
          status:
            sellOrder.remainingQuantity === tradeQuantity
              ? 'FILLED'
              : 'PARTIALLY_FILLED',
        },
      })

      // Update the buy order's remaining quantity and status
      remainingBuyQuantity -= tradeQuantity
      await prisma.order.update({
        where: { id: buyOrder.id },
        data: {
          remainingQuantity: remainingBuyQuantity,
          status:
            remainingBuyQuantity === BigInt(0) ? 'FILLED' : 'PARTIALLY_FILLED',
        },
      })

      // Track the last matched price for the response
      matchedPrice = sellOrder.price
    }

    // If there are still unmatched quantities, unlock buyer's funds
    if (remainingBuyQuantity > BigInt(0)) {
      const unmatchedCost = remainingBuyQuantity * price
      await prisma.inrBalance.update({
        where: { userId },
        data: {
          lockedBalance: { decrement: unmatchedCost },
          balance: { increment: unmatchedCost },
        },
      })
    }

    // Return the last matched price or null if no match was found
    if (matchedPrice !== null) {
      return matchedPrice
    } else {
      throw new Error('No matching sell order found')
    }
  })
}

export const createSellOrder = async (
  userId: string,
  symbolId: string,
  quantity: bigint,
  price: bigint,
  tokenType: string
) => {
  // First check if user has enough balance
  const stockBalance = await prisma.stockBalance.findUnique({
    where: {
      userId_symbolId_tokenType: {
        userId,
        symbolId,
        tokenType,
      },
    },
  })

  if (!stockBalance || stockBalance.quantity < quantity) {
    throw new Error('Insufficient stock balance')
  }

  // Lock the tokens
  await prisma.stockBalance.update({
    where: {
      userId_symbolId_tokenType: {
        userId,
        symbolId,
        tokenType,
      },
    },
    data: {
      quantity: {
        decrement: quantity,
      },
      lockedQuantity: {
        increment: quantity,
      },
    },
  })

  // Create sell order
  await prisma.order.create({
    data: {
      userId,
      symbolId,
      orderType: 'SELL',
      tokenType,
      quantity,
      remainingQuantity: quantity,
      price,
      status: 'OPEN',
    },
  })
}

export const cancelOrder = async (
  userId: string,
  symbolId: string,
  quantity: bigint,
  price: bigint,
  tokenType: string,
  orderType: 'BUY' | 'SELL'
) => {
  // Find the matching order
  const order = await prisma.order.findFirst({
    where: {
      userId,
      symbolId,
      tokenType,
      orderType,
      price,
      status: 'OPEN',
      remainingQuantity: quantity,
    },
  })

  if (!order) {
    throw new Error('Order not found')
  }

  // Update order status
  await prisma.order.update({
    where: { id: order.id },
    data: { status: 'CANCELLED' },
  })

  // Return locked assets
  if (orderType === 'SELL') {
    // Return locked tokens
    await prisma.stockBalance.update({
      where: {
        userId_symbolId_tokenType: {
          userId,
          symbolId,
          tokenType,
        },
      },
      data: {
        quantity: { increment: quantity },
        lockedQuantity: { decrement: quantity },
      },
    })
  } else {
    // Return locked INR
    const lockedAmount = quantity * price
    await prisma.inrBalance.update({
      where: { userId },
      data: {
        balance: { increment: lockedAmount },
        lockedBalance: { decrement: lockedAmount },
      },
    })
  }
}
