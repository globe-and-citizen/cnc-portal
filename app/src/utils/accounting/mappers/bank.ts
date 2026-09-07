/**
 * Bank source mapper — turns indexed Bank events into ledger entries.
 *
 * Coverage (spec §4):
 * - `Deposited` / `TokenDeposited` (cash in):
 *   - from an internal pocket → **internal funding move** (Dr Cash — Bank · Cr that pocket)
 *   - from anyone external     → **UC-BANK-02** (Dr Cash — Bank · Cr Service Revenue)
 * - `Transfer` / `TokenTransfer` (cash out):
 *   - to an internal pocket → **UC-BANK-03** funding move (Dr that pocket · Cr Cash — Bank)
 *   - to anyone else        → unclassified outflow, flagged `needs-off-chain-data`
 *
 * - `FeePaid` → another posting of the same source operation
 *   (Dr Transaction Fee Expense · Cr Cash — Bank).
 *
 * `DividendDistributionTriggered` is not mapped: booking it as well as the
 * per-shareholder `Investor DividendPaid` would double-count the dividend.
 */
import type {
  BankDepositRow,
  BankFeePaidRow,
  BankTokenDepositRow,
  BankTransferRow,
  BankTokenTransferRow
} from '@/types/contract-events/bank'
import { makeEntry, sourceOperationIdOf, type LedgerEntry } from '@/utils/accounting/ledgerEntry'
import { isInternalAddress } from '@/utils/accounting/internalAddresses'
import { atDate, type MapperContext } from './context'
import { applyClassification } from './applyClassification'

export interface BankMapperInput {
  deposits?: readonly BankDepositRow[]
  tokenDeposits?: readonly BankTokenDepositRow[]
  transfers?: readonly BankTransferRow[]
  tokenTransfers?: readonly BankTokenTransferRow[]
  fees?: readonly BankFeePaidRow[]
}

const BANK = 'Cash — Bank' as const

/** Map a single Bank deposit (native or token) to its ledger entry. */
function mapDeposit(
  row: {
    id: string
    contractAddress: string
    depositor: string
    amount: string
    timestamp: number
  },
  token: string | null,
  ctx: MapperContext
): LedgerEntry {
  const amountUsd = ctx.toUsd(BigInt(row.amount), ctx.tokenIdOf(token), atDate(row.timestamp))
  const sourcePocket = ctx.pocketOf(row.depositor)

  const inferred = sourcePocket
    ? makeEntry({
        id: row.id,
        sourceOperationId: sourceOperationIdOf(row.id),
        timestamp: row.timestamp,
        useCase: 'INTERNAL',
        debit: BANK,
        debitInstance: row.contractAddress,
        credit: sourcePocket,
        creditInstance: row.depositor,
        amountUsd,
        token: ctx.tokenIdOf(token),
        rawAmount: row.amount,
        counterparty: row.depositor,
        internal: true,
        memo: `Internal funding into Bank from ${sourcePocket}`
      })
    : makeEntry({
        id: row.id,
        sourceOperationId: sourceOperationIdOf(row.id),
        timestamp: row.timestamp,
        useCase: 'UC-BANK-02',
        debit: BANK,
        debitInstance: row.contractAddress,
        credit: 'Service Revenue',
        amountUsd,
        token: ctx.tokenIdOf(token),
        rawAmount: row.amount,
        counterparty: row.depositor,
        memo: 'Direct deposit into Bank'
      })

  // A deposit is determined by its source evidence: external cash is Service
  // Revenue and a CNC-owned source is an internal move. A legacy category must
  // not replace either journal account.
  return inferred
}

/** Map a single Bank transfer-out (native or token) to its ledger entry. */
function mapTransfer(
  row: { id: string; contractAddress: string; to: string; amount: string; timestamp: number },
  token: string | null,
  ctx: MapperContext
): LedgerEntry {
  const tokenId = ctx.tokenIdOf(token)
  const amountUsd = ctx.toUsd(BigInt(row.amount), tokenId, atDate(row.timestamp))
  const destPocket = ctx.pocketOf(row.to)

  const inferred = destPocket
    ? makeEntry({
        id: row.id,
        sourceOperationId: sourceOperationIdOf(row.id),
        timestamp: row.timestamp,
        useCase: 'UC-BANK-03',
        debit: destPocket,
        debitInstance: row.to,
        credit: BANK,
        creditInstance: row.contractAddress,
        amountUsd,
        token: tokenId,
        rawAmount: row.amount,
        counterparty: row.to,
        internal: true,
        memo: `Fund ${destPocket} from Bank`
      })
    : // External outflow with no Phase-1 use case — provisionally an operating cost,
      // flagged so an off-chain / manual review can reclassify it (spec §6).
      makeEntry({
        id: row.id,
        sourceOperationId: sourceOperationIdOf(row.id),
        timestamp: row.timestamp,
        useCase: 'CASH-OUT',
        debit: 'Operating Expense',
        credit: BANK,
        creditInstance: row.contractAddress,
        amountUsd,
        token: tokenId,
        rawAmount: row.amount,
        counterparty: row.to,
        internal: isInternalAddress(row.to, ctx.internalAddresses),
        memo: 'Unclassified Bank outflow to external address',
        enrichment: 'needs-off-chain-data'
      })

  return inferred.internal ? inferred : applyClassification(inferred, 'out', BANK, ctx)
}

/** Map a protocol fee as another posting of its Bank transaction. */
function mapFee(row: BankFeePaidRow, ctx: MapperContext): LedgerEntry {
  const tokenId = ctx.tokenIdOf(row.token)
  return makeEntry({
    id: row.id,
    sourceOperationId: sourceOperationIdOf(row.id),
    timestamp: row.timestamp,
    useCase: 'FEE',
    debit: 'Transaction Fee Expense',
    credit: BANK,
    creditInstance: row.contractAddress,
    amountUsd: ctx.toUsd(BigInt(row.amount), tokenId, atDate(row.timestamp)),
    token: tokenId,
    rawAmount: row.amount,
    memo: 'Transaction fee skimmed from Bank'
  })
}

/** Map every monetary Bank event, including its transaction-bound fees. */
export function mapBankEvents(input: BankMapperInput, ctx: MapperContext): LedgerEntry[] {
  return [
    ...(input.deposits ?? []).map((row) => mapDeposit(row, null, ctx)),
    ...(input.tokenDeposits ?? []).map((row) => mapDeposit(row, row.token, ctx)),
    ...(input.transfers ?? []).map((row) => mapTransfer(row, null, ctx)),
    ...(input.tokenTransfers ?? []).map((row) => mapTransfer(row, row.token, ctx)),
    ...(input.fees ?? []).map((row) => mapFee(row, ctx))
  ]
}
