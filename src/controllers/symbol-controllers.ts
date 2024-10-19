import { Request, Response } from 'express'
import { createSymbol } from '@/services/symbol-services'
import { createExpiryDate } from '@/utils/create-expiry-date'

export const handleCreateSymbol = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params

    // Parse symbol ID format: ASSET_QUOTE_DATE_MONTH_YEAR_HOUR_MIN
    // Example: AAPL_USD_25_Oct_2024_14_00
    const parts = id.split('_')
    if (parts.length !== 7) {
      res.status(400).json({ error: 'Invalid symbol format' })
      return
    }

    const baseAssetValue = parts[0]
    const quoteAssetValue = parts[1]
    // Create expiry date using the extracted function
    const expiryDateValue = createExpiryDate(parts)

    if (!expiryDateValue) {
      res.status(400).json({ error: 'Invalid date format in symbol' })
      return
    }

    await createSymbol(id, expiryDateValue, baseAssetValue, quoteAssetValue)
    res.status(201).json({ message: `Symbol ${id} created` })
  } catch (error) {
    console.error('Symbol creation error:', error)
    res.status(500).json({ error: 'Failed to create symbol' })
  }
}
