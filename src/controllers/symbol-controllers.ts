import { createSymbol } from '@/services/symbol-services'
import { Request, Response } from 'express'

export const handleCreateSymbol = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params
    const { expiryDate, baseAsset, quoteAsset } = req.body

    // For testing: assigning default values if fields are not provided
    const expiryDateValue =
      expiryDate || new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
    const baseAssetValue = baseAsset || 'DEFAULT_BASE_ASSET'
    const quoteAssetValue = quoteAsset || 'DEFAULT_QUOTE_ASSET'

    await createSymbol(id, expiryDateValue, baseAssetValue, quoteAssetValue)

    res.status(201).json({ message: `Symbol ${id} created` })
  } catch (error) {
    res.status(500).json({ error: 'Failed to create symbol' })
  }
}
