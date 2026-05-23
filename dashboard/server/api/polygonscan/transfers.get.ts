import { isAddress } from 'viem'
import { fetchEtherscanTokenTransfers } from '~~/server/utils/etherscan'

/**
 * GET /api/polygonscan/transfers?address=0x...
 *
 * Server-side proxy for Etherscan API V2. Keeps NUXT_ETHERSCAN_API_KEY off the
 * browser. Returns the full ERC-20 (USDC) transfer history for a wallet on
 * Polygon — the raw material for Polymarket deposit/withdrawal accounting.
 */
export default defineEventHandler(async (event) => {
  const { address } = getQuery(event)
  const wallet = String(address ?? '').trim()

  if (!isAddress(wallet)) {
    throw createError({ statusCode: 400, statusMessage: 'A valid `address` query parameter is required.' })
  }

  const apiKey = useRuntimeConfig().etherscanApiKey
  if (!apiKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Etherscan API key is not configured. Set NUXT_ETHERSCAN_API_KEY.'
    })
  }

  try {
    return await fetchEtherscanTokenTransfers(apiKey, wallet)
  } catch (error) {
    throw createError({
      statusCode: 502,
      statusMessage: error instanceof Error ? error.message : 'Failed to reach Etherscan.'
    })
  }
})
