/**
 * Shared test fixtures for the accounting source mappers — a deterministic
 * {@link MapperContext} with hand-picked addresses and a stub FX rate, so each
 * mapper spec can exercise pure logic without Vue, the chain, or a price oracle.
 */
import { formatUnits, type Address } from 'viem'
import type { TokenId } from '@/constant'
import type { AccountName } from '@/utils/accounting/chartOfAccounts'
import type { MapperContext } from '@/utils/accounting/mappers/context'

/** Lowercase addresses are always valid (no checksum to fail) — safe for tests. */
export const ADDR = {
  bank: '0x1111111111111111111111111111111111111111',
  safe: '0x2222222222222222222222222222222222222222',
  payroll: '0x3333333333333333333333333333333333333333',
  expense: '0x4444444444444444444444444444444444444444',
  feeCollector: '0x5555555555555555555555555555555555555555',
  founder: '0x6666666666666666666666666666666666666666',
  client: '0x7777777777777777777777777777777777777777',
  member: '0x8888888888888888888888888888888888888888',
  usdcToken: '0x9999999999999999999999999999999999999999',
  sherToken: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
} as const

const POCKETS: Record<string, AccountName> = {
  [ADDR.bank]: 'Cash — Bank',
  [ADDR.safe]: 'Cash — Safe',
  [ADDR.payroll]: 'Cash — Payroll',
  [ADDR.expense]: 'Cash — Expense',
  [ADDR.feeCollector]: 'Cash — FeeCollector'
}

const DECIMALS: Record<TokenId, number> = { native: 18, usdc: 6, 'usdc.e': 6, usdt: 6, sher: 6 }
/** Stub rate of record: native $2, stablecoins $1, SHER $0.50. */
const RATE: Record<TokenId, number> = { native: 2, usdc: 1, 'usdc.e': 1, usdt: 1, sher: 0.5 }

/** Build a deterministic {@link MapperContext}; override any field per test. */
export function makeCtx(overrides: Partial<MapperContext> = {}): MapperContext {
  const tokenIdOf = (token: string | null | undefined): TokenId => {
    if (!token) return 'native'
    const lower = token.toLowerCase()
    if (lower === ADDR.usdcToken) return 'usdc'
    if (lower === ADDR.sherToken) return 'sher'
    return 'native'
  }
  return {
    internalAddresses: new Set(Object.keys(POCKETS) as Address[]),
    founderAddresses: new Set([ADDR.founder as Address]),
    toUsd: (amount, token) => Number(formatUnits(amount, DECIMALS[token])) * RATE[token],
    tokenIdOf,
    pocketOf: (address) => (address ? (POCKETS[address.toLowerCase()] ?? null) : null),
    ...overrides
  }
}
