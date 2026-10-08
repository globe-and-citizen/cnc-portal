/** Plain rows for the shared holdings table; fetching belongs to the caller. */
import { formatUnits } from 'viem'
import { formatExactNumber, formatNumber } from '@/utils/format'
import type { ContractBalances } from '@/types'
import EthereumIcon from '@/assets/Ethereum.png'
import USDCIcon from '@/assets/usdc.png'
import MaticIcon from '@/assets/matic-logo.png'

export interface TokenHoldingRow {
  rank: number
  token: { name: string; symbol: string }
  name: string
  address?: string | null
  icon: string | null
  quantity: string
  amountLabel: string
  amount: number | null
  price: number | null
  priceLabel: string
  balance: number | null
  balanceLabel: string
}

export function tokenHoldingIcon(symbol: string): string | null {
  if (symbol === 'USDC' || symbol === 'USDCe') return USDCIcon
  if (symbol === 'POL') return MaticIcon
  if (symbol === 'ETH') return EthereumIcon
  return null
}

export function tokenHoldingRows(balances?: ContractBalances): TokenHoldingRow[] {
  return (balances?.balances ?? []).map((entry, index) => ({
    rank: index + 1,
    token: entry.token,
    name: entry.token.name,
    icon: tokenHoldingIcon(entry.token.symbol),
    quantity: formatExactNumber(formatUnits(entry.raw, entry.token.decimals)),
    amountLabel: formatNumber(entry.amount, { maxDecimals: entry.token.decimals }),
    amount: entry.amount,
    price: entry.price.local.value,
    priceLabel: entry.price.local.formatted,
    balance: entry.value.local.value,
    balanceLabel: entry.value.local.formatted
  }))
}
