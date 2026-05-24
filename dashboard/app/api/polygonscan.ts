import { isAddress } from 'viem'

/**
 * One ERC-20 transfer, as returned by our `/api/polygonscan/transfers` route
 * (which proxies Etherscan API V2 `account/tokentx` on Polygon).
 */
export interface PolygonTokenTransfer {
  blockNumber: string
  /** Unix seconds, as a string. */
  timeStamp: string
  hash: string
  from: string
  to: string
  /** Raw amount in token base units (divide by 10 ** tokenDecimal). */
  value: string
  contractAddress: string
  tokenName: string
  tokenSymbol: string
  tokenDecimal: string
}

export interface PolygonTransfersResult {
  transfers: PolygonTokenTransfer[]
  /** True when the history was too long to fetch in full. */
  truncated: boolean
}

/**
 * Fetches a wallet's full ERC-20 transfer history on Polygon via our own
 * server route (the Etherscan key never reaches the browser).
 */
export async function fetchPolygonTokenTransfers(address: string): Promise<PolygonTransfersResult> {
  const wallet = address.trim()
  if (!isAddress(wallet as `0x${string}`)) {
    throw new Error('Invalid wallet address')
  }

  return await $fetch<PolygonTransfersResult>('/api/polygonscan/transfers', {
    params: { address: wallet }
  })
}
