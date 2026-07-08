/**
 * Server-side Etherscan API V2 helper.
 *
 * Etherscan V2 is a single multichain API: one key works for every chain via
 * the `chainid` parameter (Polygon = 137). The legacy per-chain endpoints
 * (api.polygonscan.com) were sunset on 2025-08-15.
 * @see https://docs.etherscan.io/etherscan-v2/v2-quickstart
 *
 * Pagination strategy. Etherscan caps a single `account/tokentx` window at
 *  `MAX_PAGES_PER_CURSOR × PAGE_SIZE = 100 000` rows. Anything beyond that
 *  cannot be reached with `page`; we must restart pagination with `startblock`
 *  advanced to the last block we saw. Because a single block can contain more
 *  rows than fit on one page, we keep `startblock = lastBlockSeen` (not `+1`)
 *  and dedupe on the cycle boundary by transfer hash to avoid losing the tail
 *  of the boundary block.
 */

const ETHERSCAN_V2_BASE = 'https://api.etherscan.io/v2/api'
const POLYGON_CHAIN_ID = 137
/** Etherscan caps a single page at 10_000 rows. */
const DEFAULT_PAGE_SIZE = 10_000
/** Maximum `page` index per cursor cycle (Etherscan refuses page > 10). */
const DEFAULT_MAX_PAGES_PER_CURSOR = 10
/** Absolute safety cap so a runaway wallet still terminates. */
const DEFAULT_MAX_TOTAL_TRANSFERS = 500_000

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
  /** True when MAX_TOTAL_TRANSFERS was hit and older transfers may be missing. */
  truncated: boolean
}

/** Stable per-transfer identity for cycle-boundary dedupe. */
function transferKey(t: EtherscanTokenTransfer): string {
  return `${t.hash}|${t.from}|${t.to}|${t.value}`
}

interface FetchPageParams {
  apiKey: string
  address: string
  page: number
  startblock: number
  offset: number
}

/** Fetches one page; throws on any real Etherscan error, returns [] on "no transactions". */
async function fetchTokentxPage(params: FetchPageParams): Promise<EtherscanTokenTransfer[]> {
  const res = await $fetch<EtherscanEnvelope>(ETHERSCAN_V2_BASE, {
    params: {
      chainid: POLYGON_CHAIN_ID,
      module: 'account',
      action: 'tokentx',
      address: params.address,
      startblock: params.startblock,
      page: params.page,
      offset: params.offset,
      sort: 'asc',
      apikey: params.apiKey
    }
  })

  if (res.status !== '1') {
    // An empty wallet (or empty trailing page) reports this — treat as "done".
    if (/no transactions found/i.test(res.message ?? '')) {
      return []
    }
    // Anything else (bad key, rate limit, invalid param) is a real error.
    const detail = typeof res.result === 'string' ? res.result : res.message
    throw new Error(`Etherscan API error: ${detail || 'unknown error'}`)
  }

  return Array.isArray(res.result) ? res.result : []
}

/**
 * Test-only overrides for the pagination constants. Production callers should
 * pass nothing; tests use small page sizes to exercise the cursor logic without
 * allocating 100 000+ rows.
 */
export interface FetchEtherscanOptions {
  pageSize?: number
  maxPagesPerCursor?: number
  maxTotalTransfers?: number
}

/**
 * Fetches the full ERC-20 transfer history for an address on Polygon.
 * `tokentx` returns only ERC-20 transfers (no ERC-1155 outcome tokens), so for
 * a Polymarket proxy wallet this is essentially the USDC cash movement log.
 *
 * Walks two nested loops: an outer `startblock` cursor that hops past the
 * 100 000-row per-cursor limit, and an inner `page` loop within each cursor.
 */
export async function fetchEtherscanTokenTransfers(
  apiKey: string,
  address: string,
  options: FetchEtherscanOptions = {}
): Promise<TokenTransfersResult> {
  const pageSize = options.pageSize ?? DEFAULT_PAGE_SIZE
  const maxPagesPerCursor = options.maxPagesPerCursor ?? DEFAULT_MAX_PAGES_PER_CURSOR
  const maxTotalTransfers = options.maxTotalTransfers ?? DEFAULT_MAX_TOTAL_TRANSFERS

  const transfers: EtherscanTokenTransfer[] = []
  const seenKeys = new Set<string>()
  let truncated = false
  let startblock = 0
  let safetyCycles = 0
  const MAX_CYCLES = Math.ceil(maxTotalTransfers / (maxPagesPerCursor * pageSize)) + 2

  outer: while (safetyCycles++ < MAX_CYCLES) {
    let lastBlockSeen = startblock
    let cursorYieldedAnything = false
    let cursorExhausted = false

    for (let page = 1; page <= maxPagesPerCursor; page++) {
      const batch = await fetchTokentxPage({ apiKey, address, page, startblock, offset: pageSize })

      // Dedupe (only the first page of a non-zero startblock cycle can repeat).
      let added = 0
      for (const row of batch) {
        const key = transferKey(row)
        if (seenKeys.has(key)) {
          continue
        }
        seenKeys.add(key)
        transfers.push(row)
        added += 1
        lastBlockSeen = Math.max(lastBlockSeen, Number(row.blockNumber) || 0)

        if (transfers.length >= maxTotalTransfers) {
          truncated = true
          break outer
        }
      }
      if (added > 0) {
        cursorYieldedAnything = true
      }

      if (batch.length < pageSize) {
        // Short page — wallet history is exhausted at this cursor.
        cursorExhausted = true
        break
      }
    }

    if (cursorExhausted) {
      break
    }
    if (!cursorYieldedAnything) {
      // The cursor advanced but every row was a duplicate of the previous cycle —
      // means the boundary block is larger than our page budget; cannot progress.
      break
    }
    if (lastBlockSeen <= startblock) {
      // Defensive: never go backwards or stall.
      break
    }
    startblock = lastBlockSeen
  }

  return { transfers, truncated }
}
