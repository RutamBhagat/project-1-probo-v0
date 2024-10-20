import { prisma } from '@/app'

export async function createBuyOrder(
  userId: string,
  symbolId: string,
  quantity: bigint,
  price: bigint,
  tokenType: string
): Promise<{ matchedPrice: bigint | null; remainingQuantity: bigint }> {
  return await prisma.$transaction(async (prisma) => {
    const totalCost = quantity * price

    // Ensure buyer has sufficient balance
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

    // Match against available sell orders
    const matchingSellOrders = await prisma.order.findMany({
      where: {
        symbolId,
        tokenType,
        orderType: 'SELL',
        status: 'OPEN',
        price: {
          lte: price, // Match sell orders with price <= buy price
        },
      },
      orderBy: [{ price: 'asc' }, { createdAt: 'asc' }],
    })

    for (const sellOrder of matchingSellOrders) {
      if (remainingBuyQuantity === BigInt(0)) break

      const tradeQuantity =
        sellOrder.remainingQuantity < remainingBuyQuantity
          ? sellOrder.remainingQuantity
          : remainingBuyQuantity

      const tradeValue = tradeQuantity * sellOrder.price

      // Create trade record
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

      // Update buyer's and seller's balances
      await prisma.stockBalance.upsert({
        where: { userId_symbolId_tokenType: { userId, symbolId, tokenType } },
        update: { quantity: { increment: tradeQuantity } },
        create: { userId, symbolId, tokenType, quantity: tradeQuantity },
      })

      await prisma.inrBalance.update({
        where: { userId: sellOrder.userId },
        data: { balance: { increment: tradeValue } },
      })

      // Update the sell order
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

      // Update seller's stock balance
      await prisma.stockBalance.update({
        where: {
          userId_symbolId_tokenType: {
            userId: sellOrder.userId,
            symbolId,
            tokenType,
          },
        },
        data: { lockedQuantity: { decrement: tradeQuantity } },
      })

      remainingBuyQuantity -= tradeQuantity
      matchedPrice = sellOrder.price
    }

    // Unlock funds for matched quantity if there was a match
    if (quantity > remainingBuyQuantity && matchedPrice !== null) {
      const matchedQuantity = quantity - remainingBuyQuantity
      const matchedCost = matchedQuantity * matchedPrice
      await prisma.inrBalance.update({
        where: { userId },
        data: { lockedBalance: { decrement: matchedCost } },
      })
    } else if (matchedPrice === null) {
      // If there was no match at all, unlock all locked funds
      const totalCost = quantity * price
      await prisma.inrBalance.update({
        where: { userId },
        data: {
          lockedBalance: { decrement: totalCost },
          balance: { increment: totalCost },
        },
      })
    }

    // Update buy order status
    await prisma.order.update({
      where: { id: buyOrder.id },
      data: {
        remainingQuantity: remainingBuyQuantity,
        status:
          remainingBuyQuantity === BigInt(0) ? 'FILLED' : 'PARTIALLY_FILLED',
      },
    })

    return { matchedPrice, remainingQuantity: remainingBuyQuantity }
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
