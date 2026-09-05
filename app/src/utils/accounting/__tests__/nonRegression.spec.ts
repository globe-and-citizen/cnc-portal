/**
 * Non-regression: exporting the same history twice must yield byte-identical
 * totals, and the accounting identities must hold on every export (spec §5,
 * LIVRABLE). Guards the class of bug the ticket calls out — the accounting
 * identity and Net income "recassent d'un export à l'autre".
 *
 * The books are assembled entirely from native (POL) events at a fixed rate of
 * record, so this also proves the POL price-of-record now feeds the fee metric
 * and the asset side (both previously stuck at $0.00).
 */
import { describe, it, expect } from 'vitest'
import { parseEther, type Address } from 'viem'
import type { CncAccountingInput } from '../assemble'
import type { BankEventFeed } from '@/types/contract-events/bank'
import type { TeamContract } from '@/types/teamContract'
import type { UsdRateOfRecord } from '../toUsd'
import { assembleAccounting } from './assembleAccounting'

// All-numeric hex so `getAddress` is a no-op — the addresses survive the
// checksum normalization the mapper context applies (matches the shared fixtures).
const ADDR = {
  bank: '0x1111111111111111111111111111111111111111',
  feeCollector: '0x5555555555555555555555555555555555555555',
  founder: '0x6666666666666666666666666666666666666666',
  external: '0x7777777777777777777777777777777777777777'
} as const

const POL_USD = 0.08
const TS = 1_700_000_000 // a fixed block time
const BANK_OUTFLOW_OPERATION = `0x${'f'.repeat(64)}`

/** Native rate of record: $0.08 / POL, deterministic (USDC would be pegged $1). */
const rateOfRecord: UsdRateOfRecord = (tokenId) => (tokenId === 'native' ? POL_USD : 0)

function contract(type: TeamContract['type'], address: string): TeamContract {
  return { type, address: address as Address, deployer: address as Address, admins: [] }
}

/** A minimal `BankEventFeed` carrying only the events the mappers read. */
function bankEvents(partial: Partial<BankEventFeed>): BankEventFeed {
  return partial as BankEventFeed
}

/** One team's history: a direct deposit, an external payout and a protocol fee — all in POL. */
function sampleInput(): CncAccountingInput {
  return {
    contracts: [contract('Bank', ADDR.bank)],
    rateOfRecord,
    bankEvents: bankEvents({
      // 100 POL direct deposit → Service Revenue
      bankDeposits: {
        items: [
          {
            id: 'd1',
            contractAddress: ADDR.bank,
            depositor: ADDR.founder,
            amount: parseEther('100').toString(),
            timestamp: TS
          }
        ]
      },
      // 20 POL paid out to an external address → Operating Expense
      bankTransfers: {
        items: [
          {
            id: `${BANK_OUTFLOW_OPERATION}-1`,
            sender: ADDR.bank,
            to: ADDR.external,
            amount: parseEther('20').toString(),
            timestamp: TS
          }
        ]
      },
      // 5 POL protocol fee skimmed to the FeeCollector → Transaction Fee Expense
      bankFeePaids: {
        items: [
          {
            id: `${BANK_OUTFLOW_OPERATION}-2`,
            contractAddress: ADDR.bank,
            feeCollector: ADDR.feeCollector,
            token: null,
            amount: parseEther('5').toString(),
            timestamp: TS
          }
        ]
      }
    })
  }
}

describe('accounting non-regression', () => {
  it('produces identical statements when the same history is exported twice', () => {
    const first = assembleAccounting(sampleInput())
    const second = assembleAccounting(sampleInput())

    expect(second.summary).toEqual(first.summary)
    expect(second.generalLedger).toEqual(first.generalLedger)
    expect(second.incomeStatement).toEqual(first.incomeStatement)
    expect(second.balanceSheet).toEqual(first.balanceSheet)
  })

  it('keeps the balance-sheet identity and a single Net income across the reports', () => {
    const { incomeStatement, balanceSheet } = assembleAccounting(sampleInput())

    // Assets = Liabilities + Equity, exactly (spec §5).
    expect(balanceSheet.balanced).toBe(true)
    expect(balanceSheet.totalAssets).toBe(balanceSheet.totalLiabilitiesAndEquity)
    // Net income is one number — the income statement's figure is what closes
    // into Retained Earnings, so the Summary card and the balance sheet agree.
    expect(balanceSheet.retainedEarnings).toBe(incomeStatement.netIncome)
  })

  it('values POL at its rate of record: the fee metric and assets are no longer $0.00', () => {
    const { summary, balanceSheet } = assembleAccounting(sampleInput())

    // 100 − 20 − 5 = 75 POL in Bank, at $0.08 → $6.00 total assets.
    expect(balanceSheet.totalAssets).toBe(6)
    expect(summary.cash).toBe(6)
    // The 5 POL fee is now a real, non-zero Transaction Fee Expense.
    expect(summary.transactionFees).toBeCloseTo(0.4, 6)
    expect(summary.transactionFees).toBeGreaterThan(0)
    // revenue 8.0 − expense (1.6 operating + 0.4 fee) = 6.0
    expect(summary.expense).toBeCloseTo(2, 6)
    expect(balanceSheet.retainedEarnings).toBeCloseTo(6, 6)
  })

  it('stamps every posting with its currency, quantity and rate of record (Taux)', () => {
    const { entries } = assembleAccounting(sampleInput())

    expect(entries.length).toBeGreaterThan(0)
    for (const entry of entries) {
      expect(entry.token).toBe('native')
      // Every native posting carries the $0.08 rate of record, stored at 6-dp.
      expect(entry.rate).toBe(POL_USD)
      // amountUsd = whole-token quantity × rate, so the derived USD is consistent.
      expect(entry.amountUsd).toBeGreaterThan(0)
    }
  })
})
