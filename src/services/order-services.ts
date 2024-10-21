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
    console.log(
      `User ${userId} has sufficient balance: ${buyerBalance.balance.toString()}`
    )

    // Lock the user's balance
    await prisma.inrBalance.update({
      where: { userId },
      data: {
        balance: { decrement: totalCost },
        lockedBalance: { increment: totalCost },
      },
    })
    console.log(`User ${userId} balance locked: ${totalCost.toString()}`)

    let spentAmount = BigInt(0)
    let remainingBuyQuantity = quantity
    let matchedPrice: bigint | null = null

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
    console.log(
      `Buy order created for ${quantity.toString()} tokens at price ${price.toString()}`
    )

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

    console.log(
      `Found ${
        matchingSellOrders.length
      } matching sell orders for price <= ${price.toString()}`
    )

    for (const sellOrder of matchingSellOrders) {
      if (remainingBuyQuantity === BigInt(0)) break

      const tradeQuantity =
        sellOrder.remainingQuantity < remainingBuyQuantity
          ? sellOrder.remainingQuantity
          : remainingBuyQuantity

      const tradeValue = tradeQuantity * sellOrder.price

      console.log(
        `Matching sell order ${
          sellOrder.id
        } for trade quantity ${tradeQuantity.toString()} at price ${sellOrder.price.toString()}`
      )

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
      console.log(
        `Trade created for buyer ${userId} and seller ${
          sellOrder.userId
        }, quantity: ${tradeQuantity.toString()}`
      )

      // Update buyer's and seller's balances
      await prisma.stockBalance.upsert({
        where: { userId_symbolId_tokenType: { userId, symbolId, tokenType } },
        update: { quantity: { increment: tradeQuantity } },
        create: { userId, symbolId, tokenType, quantity: tradeQuantity },
      })
      console.log(
        `Buyer's stock balance updated with ${tradeQuantity.toString()} tokens`
      )

      await prisma.inrBalance.update({
        where: { userId: sellOrder.userId },
        data: { balance: { increment: tradeValue } },
      })
      console.log(
        `Seller ${
          sellOrder.userId
        } INR balance incremented by ${tradeValue.toString()}`
      )

      spentAmount += tradeValue

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
      console.log(
        `Sell order ${sellOrder.id} updated: ${tradeQuantity.toString()} filled`
      )

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
      console.log(
        `Seller's locked stock balance decremented by ${tradeQuantity.toString()}`
      )

      remainingBuyQuantity -= tradeQuantity
      matchedPrice = sellOrder.price
      console.log(`Remaining buy quantity: ${remainingBuyQuantity.toString()}`)
    }

    // Calculate the amount to unlock
    const amountToUnlock = totalCost - spentAmount
    console.log(
      `Total cost: ${totalCost.toString()}, spent amount: ${spentAmount.toString()}, amount to unlock: ${amountToUnlock.toString()}`
    )

    // Unlock the remaining balance and update locked balance
    await prisma.inrBalance.update({
      where: { userId },
      data: {
        lockedBalance: { decrement: totalCost },
        balance: { increment: amountToUnlock },
      },
    })
    console.log(
      `Unlocked balance for user ${userId}: ${amountToUnlock.toString()}`
    )

    // Update buy order status
    await prisma.order.update({
      where: { id: buyOrder.id },
      data: {
        remainingQuantity: remainingBuyQuantity,
        status:
          remainingBuyQuantity === BigInt(0) ? 'FILLED' : 'PARTIALLY_FILLED',
      },
    })
    console.log(
      `Buy order status updated: remaining quantity ${remainingBuyQuantity.toString()}, status ${
        remainingBuyQuantity === BigInt(0) ? 'FILLED' : 'PARTIALLY_FILLED'
      }`
    )

    return {
      matchedPrice: matchedPrice === price ? null : matchedPrice,
      remainingQuantity: remainingBuyQuantity,
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
