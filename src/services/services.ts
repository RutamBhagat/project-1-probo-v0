// services.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export const createBuyOrder = async (
  userId: string,
  symbolId: string,
  quantity: bigint,
  price: bigint,
  tokenType: string
) => {
  // Lock INR balance
  const totalCost = quantity * price

  await prisma.inrBalance.update({
    where: { userId },
    data: {
      balance: {
        decrement: totalCost,
      },
      lockedBalance: {
        increment: totalCost,
      },
    },
  })

  // Find matching sell orders
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
    orderBy: {
      price: 'asc',
    },
  })

  if (matchingSellOrder) {
    // Create trade
    await prisma.trade.create({
      data: {
        symbolId,
        tokenType,
        buyerId: userId,
        sellerId: matchingSellOrder.userId,
        buyerOrderId: 0, // Will be updated after buy order creation
        sellerOrderId: matchingSellOrder.id,
        quantity,
        price: matchingSellOrder.price,
      },
    })

    // Update seller's locked tokens
    await prisma.stockBalance.update({
      where: {
        userId_symbolId_tokenType: {
          userId: matchingSellOrder.userId,
          symbolId,
          tokenType,
        },
      },
      data: {
        lockedQuantity: {
          decrement: quantity,
        },
      },
    })

    // Update seller's INR balance
    const tradeValue = quantity * matchingSellOrder.price
    await prisma.inrBalance.update({
      where: { userId: matchingSellOrder.userId },
      data: {
        balance: {
          increment: tradeValue,
        },
      },
    })

    // Update buyer's INR balance (refund excess if any)
    const refundAmount = totalCost - tradeValue
    await prisma.inrBalance.update({
      where: { userId },
      data: {
        lockedBalance: {
          decrement: totalCost,
        },
        balance: {
          increment: refundAmount,
        },
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
      update: {
        quantity: {
          increment: quantity,
        },
      },
      create: {
        userId,
        symbolId,
        tokenType,
        quantity,
      },
    })

    // Update sell order status
    await prisma.order.update({
      where: { id: matchingSellOrder.id },
      data: {
        remainingQuantity: {
          decrement: quantity,
        },
        status:
          matchingSellOrder.remainingQuantity === quantity
            ? 'FILLED'
            : 'PARTIALLY_FILLED',
      },
    })
  }
}

export const getAllInrBalances = async () => {
  const balances = await prisma.inrBalance.findMany()

  // Format balances as per test requirements
  const formattedBalances: {
    [key: string]: { balance: number; locked: number }
  } = {}
  balances.forEach((balance) => {
    formattedBalances[balance.userId] = {
      balance: Number(balance.balance),
      locked: Number(balance.lockedBalance),
    }
  })

  return formattedBalances
}
