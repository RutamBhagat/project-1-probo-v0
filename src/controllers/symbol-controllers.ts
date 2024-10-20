import type { Request, Response } from 'express'
import { createSymbol } from '@/services/symbol-services'
import { createExpiryDate } from '@/utils/create-expiry-date'

type SymbolResponse = {
  message: string
}

type ErrorResponse = {
  message: string
}

export const handleCreateSymbol = async (
  req: Request<{ id: string }, SymbolResponse | ErrorResponse>,
  res: Response<SymbolResponse | ErrorResponse>
) => {
  try {
    const { id } = req.params

    // Parse symbol ID format: ASSET_QUOTE_DATE_MONTH_YEAR_HOUR_MIN
    // Example: AAPL_USD_25_Oct_2024_14_00
    const parts = id.split('_')
    if (parts.length !== 7) {
      return res.status(400).json({ message: 'Invalid symbol format' })
    }

    const baseAssetValue = parts[0]!
    const quoteAssetValue = parts[1]!
    // Create expiry date using the extracted function
    const expiryDateValue = createExpiryDate(parts)

    if (!expiryDateValue) {
      return res.status(400).json({ message: 'Invalid date format in symbol' })
    }

    await createSymbol(id, expiryDateValue, baseAssetValue, quoteAssetValue)
    return res.status(201).json({ message: `Symbol ${id} created` })
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'
    console.error('Symbol creation error:', errorMessage)
    return res.status(500).json({ message: errorMessage })
  }
}
