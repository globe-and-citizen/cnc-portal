import { describe, it, expect } from 'vitest'
import { buildGeneralLedger } from '@/utils/accounting/generalLedger'
import type { AccountName } from '@/utils/accounting/chartOfAccounts'
import type { LedgerEntry } from '@/utils/accounting/ledgerEntry'
import { catalogueLedger } from './catalogueLedger'

describe('buildGeneralLedger — catalogue worked example', () => {
  const gl = buildGeneralLedger(catalogueLedger)
  const balanceOf = (account: AccountName): number =>
    gl.trialBalance.find((r) => r.account === account)?.balance ?? 0

  it('is balanced gross (Σ debit lines = Σ credit lines = journal total)', () => {
    expect(gl.totalDebit).toBeCloseTo(678.1, 2)
    expect(gl.totalCredit).toBeCloseTo(678.1, 2)
  })

  it('is balanced net (Σ debit balances = Σ credit balances = trial balance)', () => {
    expect(gl.debitBalanceTotal).toBeCloseTo(253, 2)
    expect(gl.creditBalanceTotal).toBeCloseTo(253, 2)
    expect(gl.balanced).toBe(true)
  })

  it('produces the catalogue §6.3 / §6.4 per-account balances', () => {
    expect(balanceOf('Cash — Safe')).toBeCloseTo(101.25, 2)
    expect(balanceOf('Cash — Bank')).toBeCloseTo(0, 2)
    expect(balanceOf('Cash — Payroll')).toBeCloseTo(10.92, 2)
    expect(balanceOf('Cash — FeeCollector')).toBeCloseTo(0.23, 2)
    expect(balanceOf('Cash — Expense')).toBeCloseTo(29.8, 2)
    expect(balanceOf('Trading account')).toBeCloseTo(0, 2)
    expect(balanceOf('Investor Equity')).toBeCloseTo(138, 2)
    expect(balanceOf('Payroll Expense')).toBeCloseTo(40.8, 2)
    expect(balanceOf('Deferred SHER Compensation')).toBeCloseTo(10, 2)
    expect(balanceOf('Wage Payable')).toBeCloseTo(0, 2)
  })

  it('emits two journal lines per posting and none for memo-only entries', () => {
    const memo = gl.entries.find((e) => e.useCase === 'DEFAULT-D')
    expect(memo?.lines).toHaveLength(0)
    const dividend = gl.entries.find((e) => e.useCase === 'UC-INV-01')
    expect(dividend?.lines).toHaveLength(2)
  })

  it('drops accounts with no activity (e.g. Owner Capital this period)', () => {
    expect(gl.trialBalance.some((r) => r.account === 'Owner Capital')).toBe(false)
  })

  it('stays balanced when per-account rounding would drift a cent', () => {
    // Two 0.005 debits land on different cash accounts (each rounds up to 0.01),
    // but the pooled 0.01 credit rounds to a single 0.01. Rounding per account
    // then summing reads 0.02 vs 0.01 — "out of balance" — yet the raw totals are
    // exactly equal. The balanced check must run on the raw sums.
    const cent = (id: string, debit: AccountName, credit: AccountName): LedgerEntry => ({
      id,
      timestamp: 1,
      useCase: 'UC-BANK-02',
      debit,
      credit,
      amountUsd: 0.005,
      token: 'usdc',
      rawAmount: '5000',
      internal: false,
      memo: '',
      enrichment: 'not-applicable'
    })
    const gl2 = buildGeneralLedger([
      cent('a', 'Cash — Bank', 'Service Revenue'),
      cent('b', 'Cash — Safe', 'Service Revenue')
    ])
    expect(gl2.balanced).toBe(true)
    expect(gl2.debitBalanceTotal).toBeCloseTo(gl2.creditBalanceTotal, 2)
  })

  it('splits a redeployed pocket into per-instance trial-balance rows, newest suffixed', () => {
    // One team, two Bank contracts (a redeploy). Deposits before the redeploy hit
    // the first Bank; the deposit after it hits Bank #2 — which must carry only its
    // own transaction, while the original keeps everything up to the redeploy.
    const bank1 = '0x1111111111111111111111111111111111111111'
    const bank2 = '0x2222222222222222222222222222222222222222'
    const deposit = (
      id: string,
      instance: string,
      amountUsd: number,
      timestamp: number
    ): LedgerEntry => ({
      id,
      timestamp,
      useCase: 'UC-BANK-02',
      debit: 'Cash — Bank',
      debitInstance: instance as `0x${string}`,
      credit: 'Service Revenue',
      amountUsd,
      token: 'usdc',
      rawAmount: String(amountUsd * 1e6),
      internal: false,
      memo: '',
      enrichment: 'not-applicable'
    })
    // A leg with NO instance (a FixedReturn sweep straight to Bank) must fold into
    // the primary deployment, not spawn a phantom third row.
    const blankBankLeg: LedgerEntry = {
      id: 'd',
      timestamp: 15,
      useCase: 'UC-CREDIT-01',
      debit: 'Cash — Bank',
      credit: 'Loan Payable',
      amountUsd: 20,
      token: 'usdc',
      rawAmount: '20000000',
      internal: false,
      memo: '',
      enrichment: 'not-applicable'
    }
    const gl2 = buildGeneralLedger([
      deposit('a', bank1, 100, 10),
      deposit('b', bank1, 50, 20),
      deposit('c', bank2, 30, 30), // after the redeploy → the new Bank
      blankBankLeg
    ])
    const bankRows = gl2.trialBalance.filter((r) => r.account === 'Cash — Bank')
    expect(bankRows).toHaveLength(2) // still two rows — the blank leg folded in
    // The original deployment keeps the plain name; only later ones are numbered.
    expect(bankRows[0].accountLabel).toBe('Cash — Bank')
    expect(bankRows[0].instance).toBe(bank1)
    expect(bankRows[0].split).toBe(true)
    expect(bankRows[0].isPrimaryInstance).toBe(true)
    expect(bankRows[0].balance).toBeCloseTo(170, 2) // 150 + the 20 un-instanced leg
    expect(bankRows[1].accountLabel).toBe('Cash — Bank 2')
    expect(bankRows[1].instance).toBe(bank2)
    expect(bankRows[1].isPrimaryInstance).toBe(false)
    expect(bankRows[1].balance).toBeCloseTo(30, 2) // only the post-redeploy deposit
    // The split is presentation only: the book stays balanced and totals are whole.
    expect(gl2.balanced).toBe(true)
  })

  it('does not split Safe — its address survives redeploys', () => {
    const safeLeg = (id: string, instance: string, amountUsd: number): LedgerEntry => ({
      id,
      timestamp: Number(id),
      useCase: 'UC-BANK-02',
      debit: 'Cash — Safe',
      debitInstance: instance as `0x${string}`,
      credit: 'Service Revenue',
      amountUsd,
      token: 'usdc',
      rawAmount: String(amountUsd * 1e6),
      internal: false,
      memo: '',
      enrichment: 'not-applicable'
    })
    // Even with two different addresses stamped, Safe is not an instanced pocket,
    // so it stays a single consolidated row.
    const gl2 = buildGeneralLedger([
      safeLeg('1', '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', 10),
      safeLeg('2', '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', 5)
    ])
    const safeRows = gl2.trialBalance.filter((r) => r.account === 'Cash — Safe')
    expect(safeRows).toHaveLength(1)
    expect(safeRows[0].accountLabel).toBe('Cash — Safe')
    expect(safeRows[0].balance).toBeCloseTo(15, 2)
  })

  it('keeps a single un-redeployed pocket as one un-suffixed row', () => {
    const bank = '0x1111111111111111111111111111111111111111'
    const gl2 = buildGeneralLedger([
      {
        id: 'a',
        timestamp: 1,
        useCase: 'UC-BANK-02',
        debit: 'Cash — Bank',
        debitInstance: bank as `0x${string}`,
        credit: 'Service Revenue',
        amountUsd: 42,
        token: 'usdc',
        rawAmount: '42000000',
        internal: false,
        memo: '',
        enrichment: 'not-applicable'
      }
    ])
    const bankRows = gl2.trialBalance.filter((r) => r.account === 'Cash — Bank')
    expect(bankRows).toHaveLength(1)
    expect(bankRows[0].accountLabel).toBe('Cash — Bank') // single instance → no number
    expect(bankRows[0].split).toBe(false)
  })

  it('rejects an unbalanced posting before the trial-balance projection runs', () => {
    const halfPosting: LedgerEntry = {
      id: 'broken',
      timestamp: 1,
      useCase: 'CASH-IN',
      debit: 'Cash — Bank',
      credit: null, // mapper bug: a debit with no matching credit
      amountUsd: 5,
      token: 'usdc',
      rawAmount: '5000000',
      internal: false,
      memo: 'half posting',
      enrichment: 'not-applicable'
    }
    expect(() => buildGeneralLedger([...catalogueLedger, halfPosting])).toThrow(
      'monetary entries require at least one debit and one credit line'
    )
  })
})
