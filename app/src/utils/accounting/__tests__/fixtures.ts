/**
 * Shared test fixtures for the accounting source mappers — a deterministic
 * {@link MapperContext} with hand-picked addresses and a stub FX rate, so each
 * mapper spec can exercise pure logic without Vue, the chain, or a price oracle.
 */
import { formatUnits, parseUnits, type Address } from 'viem'
import { USDC_ADDRESS, type TokenId } from '@/constant'
import type { CncAccounting } from '@/utils/accounting/assemble'
import type { AccountName } from '@/utils/accounting/chartOfAccounts'
import { accountFor } from '@/utils/accounting/accountRegistry'
import { createJournalEntry } from '@/utils/accounting/journalEntry'
import type { JournalEntryDraft } from '@/utils/accounting/journalEntryDraft'
import type { MapperContext } from '@/utils/accounting/mappers/context'
import { USD_AMOUNT_DECIMALS, usdAmountToNumber } from '@/utils/accounting/monetaryAmount'
import type { JournalEntry, UsdAmount } from '@/utils/accounting/types'
import { assembleAccounting } from './assembleAccounting'

/** Exact accounting amount shorthand for domain-level assertions. */
export const usd = (amount: number | string): UsdAmount =>
  parseUnits(String(amount), USD_AMOUNT_DECIMALS)

/** Presentation-boundary conversion for approximate legacy expectations. */
export const usdNumber = (amount: UsdAmount): number => usdAmountToNumber(amount)

interface JournalFixtureInput extends Partial<JournalEntryDraft> {
  /** Test-only display value used to build exact final lines. */
  amountUsd?: number
}

/** Build a validated final entry for pure presenter tests without source reconciliation. */
export function journalFixture(partial: JournalFixtureInput = {}): JournalEntry {
  const { amountUsd = 500, ...draftFields } = partial
  const draft: JournalEntryDraft = {
    id: 'entry-1',
    timestamp: 1_700_000_000,
    useCase: 'CASH-IN',
    debit: 'Cash — Bank',
    credit: 'Service Revenue',
    token: 'usdc',
    rawAmount: '500000000',
    rate: 1,
    internal: false,
    memo: 'raw memo',
    enrichment: 'not-applicable',
    ...draftFields
  }
  const amount = usd(amountUsd)
  const monetary = draft.debit !== null || draft.credit !== null
  return createJournalEntry({
    id: draft.id,
    sourceOperationId: draft.sourceOperationId ?? draft.id,
    timestamp: draft.timestamp,
    useCase: draft.useCase,
    memo: draft.memo,
    internal: draft.internal,
    kind: monetary ? 'monetary' : 'memo',
    activityAmount: amount,
    ...(draft.category ? { category: draft.category } : {}),
    ...(draft.txHash ? { txHash: draft.txHash } : {}),
    ...(draft.counterparty ? { counterparty: draft.counterparty } : {}),
    ...(draft.initiator ? { initiator: draft.initiator } : {}),
    ...(draft.shares !== undefined ? { shares: draft.shares } : {}),
    ...(draft.creditOfferId ? { creditOfferId: draft.creditOfferId } : {}),
    ...(draft.creditRemainingUsd !== undefined
      ? { creditRemainingUsd: draft.creditRemainingUsd }
      : {}),
    ...(draft.minutesWorked !== undefined ? { minutesWorked: draft.minutesWorked } : {}),
    ...(draft.periodEnd !== undefined ? { periodEnd: draft.periodEnd } : {}),
    ...(draft.expenseFrequencyType !== undefined
      ? { expenseFrequencyType: draft.expenseFrequencyType }
      : {}),
    ...(draft.expenseApprovedUsd !== undefined
      ? { expenseApprovedUsd: draft.expenseApprovedUsd }
      : {}),
    ...(draft.expenseRemainingUsd !== undefined
      ? { expenseRemainingUsd: draft.expenseRemainingUsd }
      : {}),
    lines: monetary
      ? [
          ...(draft.debit
            ? [{ id: `${draft.id}:debit`, account: accountFor(draft.debit), debit: amount }]
            : []),
          ...(draft.credit
            ? [{ id: `${draft.id}:credit`, account: accountFor(draft.credit), credit: amount }]
            : [])
        ]
      : []
  })
}

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
  sherToken: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  /** The FixedReturn (Community Credit) pocket. */
  credit: '0xdddddddddddddddddddddddddddddddddddddddd',
  lender: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'
} as const

const POCKETS: Record<string, AccountName> = {
  [ADDR.bank]: 'Cash — Bank',
  [ADDR.safe]: 'Cash — Safe',
  [ADDR.payroll]: 'Cash — Payroll',
  [ADDR.expense]: 'Cash — Expense',
  [ADDR.credit]: 'Cash — Credit',
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
    toUsd: (amount, token) => Number(formatUnits(amount, DECIMALS[token])) * RATE[token],
    tokenIdOf,
    pocketOf: (address) => (address ? (POCKETS[address.toLowerCase()] ?? null) : null),
    ...overrides
  }
}

// ── FixedReturn (Community Credit) event builders ────────────────────────────

/** One USDC lending offer — the creation event carrying the token every other
 *  Community Credit event is valued from. */
export function creditOffer(offerId = '1', timestamp = 100) {
  return {
    id: `created-${offerId}`,
    contractAddress: ADDR.credit,
    offerId,
    token: ADDR.usdcToken,
    fundingTarget: '10000000',
    timestamp
  }
}

/** A per-lender credit event row — `FundsLent`, `LenderRepaid` or
 *  `PrincipalRefunded`, which share their shape. */
export function creditEvent(
  id: string,
  amount: string,
  timestamp: number,
  lender: string = ADDR.lender,
  offerId = '1'
) {
  return { id, contractAddress: ADDR.credit, offerId, lender, amount, timestamp }
}

/** Σ of an account's debit legs, in USD — what a cost account was charged. */
export function totalDebited(entries: readonly JournalEntryDraft[], account: string): number {
  return entries.reduce(
    (sum, entry) => sum + (entry.debit === account ? draftUsdValue(entry) : 0),
    0
  )
}

/** A liability's net balance — what it still owes once every leg is booked. */
export function balanceOf(entries: readonly JournalEntryDraft[], account: string): number {
  return entries.reduce(
    (sum, entry) =>
      sum +
      (entry.credit === account ? draftUsdValue(entry) : 0) -
      (entry.debit === account ? draftUsdValue(entry) : 0),
    0
  )
}

/** Approximate draft valuation for mapper-level assertions only. */
export function draftUsdValue(entry: JournalEntryDraft): number {
  return (
    Number(formatUnits(BigInt(entry.rawAmount), DECIMALS[entry.token])) *
    (entry.rate ?? RATE[entry.token])
  )
}

/**
 * A small live book run through the whole pipeline: a $100 client deposit into the
 * Bank and a $30 expense payout. Shared by the specs that need real statements
 * rather than hand-built entries.
 */
export function sampleBooks(): CncAccounting {
  return assembleAccounting({
    contracts: [
      { type: 'Bank', address: ADDR.bank as Address, deployer: ADDR.bank as Address, admins: [] },
      {
        type: 'ExpenseAccountEIP712',
        address: ADDR.expense as Address,
        deployer: ADDR.bank as Address,
        admins: []
      }
    ],
    bankEvents: {
      bankDeposits: { items: [] },
      bankTokenDeposits: {
        items: [
          {
            id: 'bd1',
            contractAddress: ADDR.bank,
            depositor: ADDR.client,
            token: USDC_ADDRESS,
            amount: '100000000', // 100 USDC, ts 100
            timestamp: 100
          }
        ]
      },
      bankTransfers: { items: [] },
      bankTokenTransfers: { items: [] },
      bankDividendDistributionTriggereds: { items: [] },
      bankFeePaids: { items: [] },
      bankOwnershipTransferreds: { items: [] },
      rawContractTokenTransfers: { items: [] }
    },
    expenseEvents: {
      expenseDeposits: { items: [] },
      expenseTokenDeposits: { items: [] },
      expenseTransfers: { items: [] },
      expenseTokenTransfers: {
        items: [
          {
            id: 'et1',
            contractAddress: ADDR.expense,
            withdrawer: ADDR.expense,
            to: ADDR.member,
            token: USDC_ADDRESS,
            amount: '30000000', // 30 USDC, ts 200
            timestamp: 200
          }
        ]
      },
      expenseApprovals: { items: [] },
      expenseOwnerTreasuryWithdrawNatives: { items: [] },
      expenseOwnerTreasuryWithdrawTokens: { items: [] },
      expenseTokenSupportAddeds: { items: [] },
      expenseTokenSupportRemoveds: { items: [] },
      expenseTokenAddressChangeds: { items: [] }
    }
  })
}
