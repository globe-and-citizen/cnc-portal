/**
 * Server-side Etherscan API V2 helper.
 *
 * Etherscan V2 is a single multichain API: one key works for every chain via
 * the `chainid` parameter (Polygon = 137). The legacy per-chain endpoints
 * (api.polygonscan.com) were sunset on 2025-08-15.
 * @see https://docs.etherscan.io/etherscan-v2/v2-quickstart
 */

const ETHERSCAN_V2_BASE = 'https://api.etherscan.io/v2/api'
const POLYGON_CHAIN_ID = 137
/** Etherscan caps a single page at 10_000 rows. */
const PAGE_SIZE = 10_000
/** Safety cap so a very active wallet can't loop forever. */
const MAX_PAGES = 10

/** One ERC-20 transfer row from Etherscan `account/tokentx`. */
export interface EtherscanTokenTransfer {
  blockNumber: string
  timeStamp: string
  hash: string
  from: string
  to: string
  value: string
  contractAddress: string
  tokenName: string
  tokenSymbol: string
  tokenDecimal: string
}

interface EtherscanEnvelope {
  status: string
  message: string
  result: EtherscanTokenTransfer[] | string
}

export interface TokenTransfersResult {
  transfers: EtherscanTokenTransfer[]
  /** True when MAX_PAGES was hit and older transfers may be missing. */
  truncated: boolean
}

/**
 * Fetches the full ERC-20 transfer history for an address on Polygon.
 * `tokentx` returns only ERC-20 transfers (no ERC-1155 outcome tokens), so for
 * a Polymarket proxy wallet this is essentially the USDC cash movement log.
 */
export async function fetchEtherscanTokenTransfers(apiKey: string, address: string): Promise<TokenTransfersResult> {
  const transfers: EtherscanTokenTransfer[] = []
  let truncated = false

  for (let page = 1; page <= MAX_PAGES; page++) {
    const res = await $fetch<EtherscanEnvelope>(ETHERSCAN_V2_BASE, {
      params: {
        chainid: POLYGON_CHAIN_ID,
        module: 'account',
        action: 'tokentx',
        address,
        page,
        offset: PAGE_SIZE,
        sort: 'asc',
        apikey: apiKey
      }
    })

    if (res.status !== '1') {
      // An empty wallet (or empty trailing page) reports this — treat as "done".
      if (/no transactions found/i.test(res.message ?? '')) {
        break
      }
      // Anything else (bad key, rate limit, invalid param) is a real error.
      const detail = typeof res.result === 'string' ? res.result : res.message
      throw new Error(`Etherscan API error: ${detail || 'unknown error'}`)
    }

    const batch = Array.isArray(res.result) ? res.result : []
    transfers.push(...batch)

    if (batch.length < PAGE_SIZE) {
      break
    }
    if (page === MAX_PAGES) {
      truncated = true
    }
  }

  return { transfers, truncated }
}
