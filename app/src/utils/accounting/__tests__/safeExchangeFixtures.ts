import { USDC_ADDRESS } from '@/constant'
import type { SafeIncomingTransfer } from '@/types/safe'
import { buildCncJournalEntryDrafts } from '../assemble'
import { ADDR } from './fixtures'

export const TOKEN = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
export const ROUTER = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
export const tx = (n: number) => `0x${String(n).padStart(64, '0')}`
export const transfer = (
  n: number,
  index: number,
  from: string,
  to: string,
  tokenAddress: string,
  value: string
): SafeIncomingTransfer => ({
  type: 'ERC20_TRANSFER',
  transferId: `${tx(n)}-${index}`,
  transactionHash: tx(n),
  executionDate: `2026-06-${String(n).padStart(2, '0')}T12:00:00Z`,
  blockNumber: n,
  from,
  to,
  tokenAddress,
  value,
  tokenInfo: {
    type: 'ERC20',
    address: tokenAddress,
    name: tokenAddress === TOKEN ? 'Aave asset' : 'USD Coin',
    symbol: tokenAddress === TOKEN ? 'AWETH' : 'USDC',
    decimals: tokenAddress === TOKEN ? 18 : 6,
    trusted: true
  }
})
export const history = () => [
  transfer(1, 0, ADDR.client, ADDR.safe, USDC_ADDRESS, '20000000'),
  transfer(2, 0, ADDR.safe, ROUTER, USDC_ADDRESS, '20000000'),
  transfer(2, 1, ROUTER, ADDR.safe, TOKEN, '10000000000000000'),
  transfer(3, 0, ADDR.safe, ROUTER, TOKEN, '10000000000000000'),
  transfer(3, 1, ROUTER, ADDR.safe, USDC_ADDRESS, '30658984')
]
export const drafts = (rows = history(), marketRate = 2000) =>
  buildCncJournalEntryDrafts({
    safeAddress: ADDR.safe,
    safeAssetTransfers: rows,
    rateOfRecord: () => marketRate
  })
