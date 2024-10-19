// services.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export const addInrBalance = async (userId: string, amount: bigint) => {
  await prisma.inrTransaction.create({
    data: {
      userId,
      amount,
      transactionType: 'DEPOSIT',
    },
  })

  await prisma.inrBalance.update({
    where: { userId },
    data: {
      balance: {
        increment: amount,
      },
    },
  })
}

export const createSymbol = async (symbolId: string) => {
  // Assuming symbol format: ASSET_QUOTE_DATE_MONTH_YEAR_HOUR_MIN
  const parts = symbolId.split('_')
  // Default expiry date set to 1 year from now for testing purposes
  const expiryDate = new Date()
  expiryDate.setFullYear(expiryDate.getFullYear() + 1)

  await prisma.symbol.create({
    data: {
      id: symbolId,
      baseAsset: parts[0], // For test assuming first part is base asset
      quoteAsset: parts[1], // For test assuming second part is quote asset
      expiryDate,
      status: 'active',
    },
  })
}

export const mintTokens = async (
  userId: string,
  symbolId: string,
  quantity: bigint,
  price: bigint
) => {
  const totalCost = quantity * price

  // Check and update INR balance
  const inrBalance = await prisma.inrBalance.findUnique({
    where: { userId },
  })

  if (!inrBalance || inrBalance.balance < totalCost) {
    throw new Error('Insufficient balance')
  }

  // Create token mint record
  await prisma.tokenMint.create({
    data: {
      userId,
      symbolId,
      quantity,
      price,
    },
  })

  // Create or update stock balances for both YES and NO tokens
  const tokenTypes = ['yes', 'no']
  for (const tokenType of tokenTypes) {
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
  }

  // Update INR balance
  const updatedBalance = await prisma.inrBalance.update({
    where: { userId },
    data: {
      balance: {
        decrement: totalCost,
      },
    },
  })

  return updatedBalance.balance
}

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

export const resetDatabase = async () => {
  // Delete all records in reverse order of dependencies
  await prisma.trade.deleteMany()
  await prisma.order.deleteMany()
  await prisma.stockBalance.deleteMany()
  await prisma.inrTransaction.deleteMany()
  await prisma.inrBalance.deleteMany()
  await prisma.tokenMint.deleteMany()
  await prisma.symbol.deleteMany()
  await prisma.user.deleteMany()
}
