import { describe, it, expect } from 'vitest'
import { buildMapperContext } from '@/utils/accounting/mappers/context'
import type { TeamContract } from '@/types/teamContract'
import { ADDR } from './fixtures'

const contracts = [
  { address: ADDR.bank, type: 'Bank' },
  { address: ADDR.safe, type: 'Safe' },
  { address: ADDR.payroll, type: 'CashRemunerationEIP712' },
  { address: ADDR.expense, type: 'ExpenseAccountEIP712' }
] as unknown as TeamContract[]

describe('buildMapperContext', () => {
  const ctx = buildMapperContext({
    contracts,
    internalAddresses: new Set(),
    founderAddresses: [ADDR.founder],
    feeCollectorAddress: ADDR.feeCollector,
    sherTokenAddress: ADDR.sherToken,
    rateOfRecord: () => 3 // $3 for every non-pegged token
  })

  it('maps each contract type to its Cash pocket account', () => {
    expect(ctx.pocketOf(ADDR.bank)).toBe('Cash — Bank')
    expect(ctx.pocketOf(ADDR.safe)).toBe('Cash — Safe')
    expect(ctx.pocketOf(ADDR.payroll)).toBe('Cash — Payroll')
    expect(ctx.pocketOf(ADDR.expense)).toBe('Cash — Expense')
    expect(ctx.pocketOf(ADDR.feeCollector)).toBe('Cash — FeeCollector')
    expect(ctx.pocketOf(ADDR.client)).toBeNull()
  })

  it('resolves token ids (zero/empty = native, SHER override, peg)', () => {
    expect(ctx.tokenIdOf(null)).toBe('native')
    expect(ctx.tokenIdOf('')).toBe('native')
    expect(ctx.tokenIdOf(ADDR.sherToken)).toBe('sher')
  })

  it('values pegged stablecoins at $1 and uses the resolver for native', () => {
    // SHER is not pegged → resolver ($3) × 1 whole token (6 decimals).
    expect(ctx.toUsd(1_000_000n, 'sher', new Date(0))).toBe(3)
    // native is not pegged → resolver ($3) × 1 whole token (18 decimals).
    expect(ctx.toUsd(10n ** 18n, 'native', new Date(0))).toBe(3)
  })

  it('checksum-normalizes founder addresses', () => {
    expect(ctx.founderAddresses.has('0x6666666666666666666666666666666666666666')).toBe(true)
  })
})
