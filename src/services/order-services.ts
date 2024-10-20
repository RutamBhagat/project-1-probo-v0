import { prisma } from '@/app'

export const createSellOrder = async (
  userId: string,
  symbolId: string,
  quantity: bigint,
  price: bigint,
  tokenType: string
) => {
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

export async function createBuyOrder(
  userId: string,
  symbolId: string,
  quantity: bigint,
  price: bigint,
  tokenType: string
): Promise<void> {
  // Use a transaction to ensure all operations are atomic
  await prisma.$transaction(async (prisma) => {
    // 1. Validate and lock buyer's INR balance
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

    // 2. Create buy order first
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

    // 3. Find matching sell orders
    const matchingSellOrder = await prisma.order.findFirst({
      where: {
        symbolId,
        tokenType,
        orderType: 'SELL',
        status: 'OPEN',
        price: {
          lte: price,
        },
        remainingQuantity: {
          gte: quantity,
        },
      },
      orderBy: [{ price: 'asc' }, { createdAt: 'asc' }],
    })

    if (matchingSellOrder) {
      // 4. Create the trade
      await prisma.trade.create({
        data: {
          symbolId,
          tokenType,
          buyerId: userId,
          sellerId: matchingSellOrder.userId,
          buyerOrderId: buyOrder.id,
          sellerOrderId: matchingSellOrder.id,
          quantity,
          price: matchingSellOrder.price,
        },
      })

      // 5. Update seller's locked tokens
      await prisma.stockBalance.update({
        where: {
          userId_symbolId_tokenType: {
            userId: matchingSellOrder.userId,
            symbolId,
            tokenType,
          },
        },
        data: {
          lockedQuantity: { decrement: quantity },
        },
      })

      // 6. Update seller's INR balance
      const tradeValue = quantity * matchingSellOrder.price
      await prisma.inrBalance.update({
        where: { userId: matchingSellOrder.userId },
        data: {
          balance: { increment: tradeValue },
        },
      })

      // 7. Update buyer's INR balance (refund excess if any)
      const refundAmount = totalCost - tradeValue
      await prisma.inrBalance.update({
        where: { userId },
        data: {
          lockedBalance: { decrement: totalCost },
          balance: { increment: refundAmount },
        },
      })

      // 8. Update buyer's token balance
      await prisma.stockBalance.upsert({
        where: {
          userId_symbolId_tokenType: {
            userId,
            symbolId,
            tokenType,
          },
        },
        update: {
          quantity: { increment: quantity },
        },
        create: {
          userId,
          symbolId,
          tokenType,
          quantity,
        },
      })

      // 9. Update orders status
      await prisma.order.update({
        where: { id: matchingSellOrder.id },
        data: {
          remainingQuantity: { decrement: quantity },
          status:
            matchingSellOrder.remainingQuantity === quantity
              ? 'FILLED'
              : 'PARTIALLY_FILLED',
        },
      })

      await prisma.order.update({
        where: { id: buyOrder.id },
        data: {
          remainingQuantity: { decrement: quantity },
          status: 'FILLED',
        },
      })
    } else {
      // If no matching sell order, unlock buyer's funds
      await prisma.inrBalance.update({
        where: { userId },
        data: {
          balance: { increment: totalCost },
          lockedBalance: { decrement: totalCost },
        },
      })

      throw new Error('No matching sell order found')
    }
  })
}
