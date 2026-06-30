/**
 * Safe source mapper — plain treasury cash in/out through the team's Gnosis Safe.
 *
 * The Safe emits no bespoke accounting events, so its moves arrive as generic
 * token transfers (native or ERC-20) classified relative to the Safe address:
 *
 * - **Inflow** (to the Safe):
 *   - from an internal pocket → internal move (Dr Cash — Safe · Cr that pocket)
 *   - from a founder          → UC-BANK-01 (Dr Cash — Safe · Cr Owner Capital)
 *   - from anyone else        → UC-BANK-02 (Dr Cash — Safe · Cr Service Revenue)
 * - **Outflow** (from the Safe):
 *   - to an internal pocket → internal move (Dr that pocket · Cr Cash — Safe)
 *   - to anyone else        → unclassified outflow, flagged `needs-off-chain-data`
 *
 * Investments routed through the SafeDepositRouter also land in the Safe, but they
 * are booked from the router event (UC-SDR-01) — those transfers should be excluded
 * by the caller to avoid double-counting the same cash.
 */
import { getAddress, isAddress } from 'viem'
import { makeEntry, type LedgerEntry } from '@/utils/accounting/ledgerEntry'
import { isInternalAddress } from '@/utils/accounting/internalAddresses'
import { atDate, type MapperContext } from './context'

/** A normalized token transfer touching the Safe (native = `token: null`). */
export interface SafeTransferRow {
  id: string
  from: string
  to: string
  token: string | null
  amount: string
  timestamp: number
  txHash?: string
}

export interface SafeMapperInput {
  /** The team's Safe address — classifies each transfer as inflow vs outflow. */
  safeAddress: string
  transfers?: readonly SafeTransferRow[]
}

const SAFE = 'Cash — Safe' as const

function sameAddress(a: string, b: string): boolean {
  return isAddress(a) && isAddress(b) && getAddress(a) === getAddress(b)
}

function mapInflow(row: SafeTransferRow, ctx: MapperContext): LedgerEntry {
  const tokenId = ctx.tokenIdOf(row.token)
  const base = {
    id: row.id,
    timestamp: row.timestamp,
    debit: SAFE,
    amountUsd: ctx.toUsd(BigInt(row.amount), tokenId, atDate(row.timestamp)),
    token: tokenId,
    rawAmount: row.amount,
    counterparty: row.from,
    txHash: row.txHash
  }
  const sourcePocket = ctx.pocketOf(row.from)
  if (sourcePocket) {
    return makeEntry({
      ...base,
      useCase: 'INTERNAL',
      credit: sourcePocket,
      internal: true,
      memo: `Internal funding into Safe from ${sourcePocket}`
    })
  }
  if (ctx.founderAddresses.has(row.from as `0x${string}`)) {
    return makeEntry({
      ...base,
      useCase: 'UC-BANK-01',
      credit: 'Owner Capital',
      memo: 'Founder deposit into Safe'
    })
  }
  // A team member funding the Safe is investing in the company (invest & get
  // SHER) → a capital contribution to Investor Equity, not client revenue. The
  // SHER count lives on the SafeDepositRouter event (UC-SDR-01); when that feed is
  // present the matching Safe inflow is excluded upstream and this branch is moot.
  if (ctx.memberAddresses.has(row.from as `0x${string}`)) {
    return makeEntry({
      ...base,
      useCase: 'UC-MEMBER-01',
      credit: 'Investor Equity',
      memo: 'Member capital contribution into Safe'
    })
  }
  return makeEntry({
    ...base,
    useCase: 'UC-BANK-02',
    credit: 'Service Revenue',
    memo: 'Client payment into Safe'
  })
}

function mapOutflow(row: SafeTransferRow, ctx: MapperContext): LedgerEntry {
  const tokenId = ctx.tokenIdOf(row.token)
  const base = {
    id: row.id,
    timestamp: row.timestamp,
    credit: SAFE,
    amountUsd: ctx.toUsd(BigInt(row.amount), tokenId, atDate(row.timestamp)),
    token: tokenId,
    rawAmount: row.amount,
    counterparty: row.to,
    txHash: row.txHash
  }
  const destPocket = ctx.pocketOf(row.to)
  if (destPocket) {
    return makeEntry({
      ...base,
      useCase: 'INTERNAL',
      debit: destPocket,
      internal: true,
      memo: `Internal move Safe → ${destPocket}`
    })
  }
  return makeEntry({
    ...base,
    useCase: 'CASH-OUT',
    debit: 'Operating Expense',
    internal: isInternalAddress(row.to, ctx.internalAddresses),
    memo: 'Unclassified Safe outflow to external address',
    enrichment: 'needs-off-chain-data'
  })
}

/** Map every Safe transfer to a ledger entry, skipping ones that miss the Safe. */
export function mapSafeTransfers(input: SafeMapperInput, ctx: MapperContext): LedgerEntry[] {
  const entries: LedgerEntry[] = []
  for (const row of input.transfers ?? []) {
    if (sameAddress(row.to, input.safeAddress)) entries.push(mapInflow(row, ctx))
    else if (sameAddress(row.from, input.safeAddress)) entries.push(mapOutflow(row, ctx))
    // A transfer touching neither side of the Safe is not a Safe move — skip it.
  }
  return entries
}
