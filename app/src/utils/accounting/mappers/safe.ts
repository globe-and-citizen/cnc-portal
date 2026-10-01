/**
 * Safe source mapper — plain treasury cash in/out through the team's Gnosis Safe.
 *
 * The Safe emits no bespoke accounting events, so its moves arrive as generic
 * token transfers (native or ERC-20) interpreted relative to the Safe address:
 *
 * - Evidenced different-asset settlement pairs become SAFE-SWAP.
 * - Unknown assets, mints and ambiguous multi-asset receipts remain unclassified.
 * - **Other inflow** (to the Safe):
 *   - from an internal pocket → internal move (Dr Cash — Safe · Cr that pocket)
 *   - from anyone external    → UC-BANK-02 (Dr Cash — Safe · Cr Service Revenue)
 * - **Outflow** (from the Safe):
 *   - to an internal pocket → internal move (Dr that pocket · Cr Cash — Safe)
 *   - to anyone else        → unassigned outflow, flagged `needs-off-chain-data`
 *
 * Investments routed through the SafeDepositRouter also land in the Safe, but they
 * are booked from the router event (UC-SDR-01) — those transfers should be excluded
 * by the caller to avoid double-counting the same cash.
 */
import { getAddress, isAddress } from 'viem'
import { makeJournalEntryDraft, type JournalEntryDraft } from '@/utils/accounting/journalEntryDraft'
import { isInternalAddress } from '@/utils/accounting/internalAddresses'
import type { MapperContext } from './context'
import { assetId, knownAssetId, type AssetMetadata } from '@/utils/tokens/assets'
import type { AssetId } from '@/utils/tokens/assets'

/** A normalized token transfer touching the Safe (native = `token: null`). */
export interface SafeTransferRow {
  id: string
  from: string
  to: string
  token: string | null
  amount: string
  timestamp: number
  txHash?: string
  asset?: AssetMetadata
}

export interface SafeMapperInput {
  /** The team's Safe address — classifies each transfer as inflow vs outflow. */
  safeAddress: string
  transfers?: readonly SafeTransferRow[]
}

const SAFE = 'Cash — Safe' as const

function tokenOf(row: SafeTransferRow, ctx: MapperContext): AssetId {
  const known = knownAssetId(row.token)
  if (known) return known
  try {
    const resolved = ctx.tokenIdOf(row.token)
    if (resolved !== 'native') return resolved
  } catch {
    /* Unknown ERC-20 is preserved using its contract identity. */
  }
  return row.asset?.id ?? assetId(row.token ?? 'unknown', 0)
}

/** Match opposing, different-asset legs with the same external settlement counterparty. */
function exchangeRowIds(input: SafeMapperInput, ctx: MapperContext): Set<string> {
  const groups = new Map<string, { incoming: SafeTransferRow[]; outgoing: SafeTransferRow[] }>()
  for (const row of input.transfers ?? []) {
    if (!row.txHash || BigInt(row.amount) <= 0n) continue
    const incoming = sameAddress(row.to, input.safeAddress)
    const outgoing = sameAddress(row.from, input.safeAddress)
    if (incoming === outgoing) continue
    const external = incoming ? row.from : row.to
    if (
      !isAddress(external) ||
      /^0x0{40}$/i.test(external) ||
      ctx.pocketOf(external) ||
      isInternalAddress(external, ctx.internalAddresses)
    )
      continue
    if (tokenOf(row, ctx) === 'sher') continue
    const key = `${row.txHash.toLowerCase()}:${external.toLowerCase()}`
    const group = groups.get(key) ?? { incoming: [], outgoing: [] }
    group[incoming ? 'incoming' : 'outgoing'].push(row)
    groups.set(key, group)
  }
  const matched = new Set<string>()
  for (const group of groups.values()) {
    const incomingTokens = new Set(group.incoming.map((row) => tokenOf(row, ctx)))
    const outgoingTokens = new Set(group.outgoing.map((row) => tokenOf(row, ctx)))
    // Complex batches remain unclassified, rather than guessing which legs belong together.
    if (
      incomingTokens.size !== 1 ||
      outgoingTokens.size !== 1 ||
      [...incomingTokens][0] === [...outgoingTokens][0]
    )
      continue
    for (const row of [...group.incoming, ...group.outgoing]) matched.add(row.id)
  }
  return matched
}

function sameAddress(a: string, b: string): boolean {
  return isAddress(a) && isAddress(b) && getAddress(a) === getAddress(b)
}

function inferInflow(
  row: SafeTransferRow,
  ctx: MapperContext,
  safeAddress: string
): JournalEntryDraft {
  const tokenId = tokenOf(row, ctx)
  const base = {
    id: row.id,
    sourceContract: safeAddress,
    timestamp: row.timestamp,
    debit: SAFE,
    debitInstance: safeAddress,
    token: tokenId,
    ...(tokenId.startsWith('erc20:')
      ? {
          asset: row.asset,
          ...(row.asset?.decimals == null
            ? { accountingIssue: 'asset-metadata-unavailable' as const }
            : {})
        }
      : {}),
    rawAmount: row.amount,
    counterparty: row.from,
    txHash: row.txHash
  }
  const sourcePocket = ctx.pocketOf(row.from)
  if (sourcePocket) {
    return makeJournalEntryDraft({
      ...base,
      useCase: 'INTERNAL',
      credit: sourcePocket,
      creditInstance: row.from,
      internal: true,
      memo: `Internal funding into Safe from ${sourcePocket}`
    })
  }
  return makeJournalEntryDraft({
    ...base,
    useCase: 'UC-BANK-02',
    credit:
      tokenId.startsWith('erc20:') || /^0x0{40}$/i.test(row.from)
        ? 'Unclassified Receipts'
        : 'Service Revenue',
    ...(tokenId.startsWith('erc20:') || /^0x0{40}$/i.test(row.from)
      ? { accountingIssue: base.accountingIssue ?? ('unclassified-asset-movement' as const) }
      : {}),
    memo: 'Direct deposit into Safe'
  })
}

function inferOutflow(
  row: SafeTransferRow,
  ctx: MapperContext,
  safeAddress: string
): JournalEntryDraft {
  const tokenId = tokenOf(row, ctx)
  const base = {
    id: row.id,
    sourceContract: safeAddress,
    timestamp: row.timestamp,
    credit: SAFE,
    creditInstance: safeAddress,
    token: tokenId,
    ...(tokenId.startsWith('erc20:')
      ? {
          asset: row.asset,
          ...(row.asset?.decimals == null
            ? { accountingIssue: 'asset-metadata-unavailable' as const }
            : {})
        }
      : {}),
    rawAmount: row.amount,
    counterparty: row.to,
    txHash: row.txHash
  }
  const destPocket = ctx.pocketOf(row.to)
  if (destPocket) {
    return makeJournalEntryDraft({
      ...base,
      useCase: 'INTERNAL',
      debit: destPocket,
      debitInstance: row.to,
      internal: true,
      memo: `Internal move Safe → ${destPocket}`
    })
  }
  return makeJournalEntryDraft({
    ...base,
    useCase: 'CASH-OUT',
    debit: 'Operating Expense',
    internal: isInternalAddress(row.to, ctx.internalAddresses),
    memo: 'Unassigned Safe outflow to external address',
    enrichment: 'needs-off-chain-data',
    ...(tokenId.startsWith('erc20:') && !base.accountingIssue
      ? { accountingIssue: 'unclassified-asset-movement' as const }
      : {})
  })
}

/** Map every Safe transfer to a ledger entry, skipping ones that miss the Safe. */
export function mapSafeTransfers(input: SafeMapperInput, ctx: MapperContext): JournalEntryDraft[] {
  const entries: JournalEntryDraft[] = []
  const exchanges = exchangeRowIds(input, ctx)
  const mixedOperations = new Set<string>()
  const byTransaction = new Map<string, SafeTransferRow[]>()
  for (const row of input.transfers ?? []) {
    if (!row.txHash) continue
    const key = row.txHash.toLowerCase()
    const group = byTransaction.get(key) ?? []
    group.push(row)
    byTransaction.set(key, group)
  }
  for (const [hash, rows] of byTransaction) {
    if (
      rows.some((row) => sameAddress(row.from, input.safeAddress)) &&
      rows.some((row) => sameAddress(row.to, input.safeAddress)) &&
      new Set(rows.map((row) => tokenOf(row, ctx))).size > 1
    )
      mixedOperations.add(hash)
  }
  for (const row of input.transfers ?? []) {
    if (sameAddress(row.to, input.safeAddress) && sameAddress(row.from, input.safeAddress)) continue
    if (exchanges.has(row.id)) {
      const token = tokenOf(row, ctx)
      const incoming = sameAddress(row.to, input.safeAddress)
      entries.push(
        makeJournalEntryDraft({
          id: row.id,
          timestamp: row.timestamp,
          txHash: row.txHash,
          sourceContract: input.safeAddress,
          useCase: 'SAFE-SWAP',
          debit: incoming ? SAFE : null,
          credit: incoming ? null : SAFE,
          debitInstance: incoming ? input.safeAddress : undefined,
          creditInstance: incoming ? undefined : input.safeAddress,
          token,
          ...(token.startsWith('erc20:') ? { asset: row.asset } : {}),
          rawAmount: row.amount,
          counterparty: incoming ? row.from : row.to,
          ...(token.startsWith('erc20:') && row.asset?.decimals == null
            ? { accountingIssue: 'asset-metadata-unavailable' }
            : {}),
          memo: 'Safe asset exchange'
        })
      )
      continue
    }
    if (sameAddress(row.to, input.safeAddress)) {
      // A Safe inflow is either a direct Service Revenue deposit or an internal
      // transfer, based on its source evidence. Do not override that posting
      // with a legacy manual category.
      const entry = inferInflow(row, ctx, input.safeAddress)
      if (!entry.internal && row.txHash && mixedOperations.has(row.txHash.toLowerCase())) {
        entry.credit = 'Unclassified Receipts'
        entry.accountingIssue ??= 'unclassified-asset-movement'
      }
      entries.push(entry)
    } else if (sameAddress(row.from, input.safeAddress)) {
      const entry = inferOutflow(row, ctx, input.safeAddress)
      if (!entry.internal && row.txHash && mixedOperations.has(row.txHash.toLowerCase()))
        entry.accountingIssue ??= 'unclassified-asset-movement'
      entries.push(entry)
    }
    // A transfer touching neither side of the Safe is not a Safe move — skip it.
  }
  return entries
}
