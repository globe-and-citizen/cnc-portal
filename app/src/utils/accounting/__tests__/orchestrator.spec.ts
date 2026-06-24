import { describe, it, expect } from 'vitest'
import { buildCncLedgerEntries, type LedgerSources } from '@/utils/accounting/mappers'
import { makeCtx, ADDR } from './fixtures'

const ctx = makeCtx()

const sources: LedgerSources = {
  bank: {
    deposits: [
      {
        id: 'b1',
        contractAddress: ADDR.bank,
        depositor: ADDR.founder,
        amount: '1000000000000000000',
        timestamp: 300
      }
    ],
    transfers: [
      { id: 'b2', sender: ADDR.bank, to: ADDR.payroll, amount: '2000000', timestamp: 100 }
    ]
  },
  fees: {
    bankFeePaids: [
      {
        id: 'f1',
        contractAddress: ADDR.bank,
        feeCollector: ADDR.feeCollector,
        token: ADDR.usdcToken,
        amount: '1000000',
        timestamp: 200
      }
    ]
  },
  cashRemuneration: {
    withdraws: [
      {
        id: 'c1',
        contractAddress: ADDR.payroll,
        withdrawer: ADDR.member,
        amount: '1000000000000000000',
        timestamp: 400
      }
    ]
  },
  safeDepositRouter: {
    deposits: [
      {
        id: 's1',
        contractAddress: ADDR.safe,
        depositor: ADDR.client,
        token: ADDR.usdcToken,
        tokenAmount: '5000000',
        sherAmount: '10000000',
        timestamp: 500
      }
    ]
  }
}

describe('buildCncLedgerEntries', () => {
  const entries = buildCncLedgerEntries(sources, ctx)

  it('runs every source and returns entries sorted by timestamp', () => {
    expect(entries.map((e) => e.timestamp)).toEqual([100, 200, 300, 400, 500])
  })

  it('produces a balanced ledger (every posting has equal debit and credit legs)', () => {
    let debits = 0
    let credits = 0
    for (const e of entries) {
      if (e.debit) debits += e.amountUsd
      if (e.credit) credits += e.amountUsd
    }
    expect(debits).toBeCloseTo(credits)
  })

  it('enriches payroll entries when off-chain data is supplied', () => {
    const enriched = buildCncLedgerEntries(sources, ctx, {
      weeklyClaims: [
        {
          memberAddress: ADDR.member,
          weekStart: new Date(400 * 1000).toISOString(),
          minutesWorked: 60,
          wage: { ratePerHour: [{ type: 'native', amount: 1 }] },
          claims: []
        } as never
      ]
    })
    const payroll = enriched.find((e) => e.useCase === 'UC-CASH-03')
    expect(payroll?.enrichment).toBe('enriched')
    expect(payroll?.category).toBe('Payroll')
  })
})
