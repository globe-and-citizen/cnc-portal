import { describe, it, expect } from 'vitest'
import { splitUnbackedIssuance } from '@/utils/accounting/unbackedIssuance'
import { makeJournalEntryDraft, type JournalEntryDraft } from '@/utils/accounting/journalEntryDraft'
import { ADDR } from './fixtures'

/** Whole SHER → base units (6 decimals). */
function raw(sher: number): string {
  return String(BigInt(Math.round(sher * 1e6)))
}

function accrual(sher: number, counterparty: string = ADDR.member) {
  return makeJournalEntryDraft({
    id: `accrual-${sher}`,
    timestamp: 100,
    useCase: 'UC-CASH-02',
    debit: 'Deferred SHER Compensation',
    credit: 'SHERS To Be Issued',
    token: 'sher',
    rawAmount: raw(sher),
    counterparty,
    memo: 'Wage earned'
  })
}

function withdrawal(sher: number) {
  return makeJournalEntryDraft({
    id: `withdraw-${sher}`,
    timestamp: 150,
    useCase: 'UC-CASH-03',
    debit: 'SHERS To Be Issued',
    credit: 'Investor Equity',
    token: 'sher',
    rawAmount: raw(sher),
    counterparty: ADDR.member,
    memo: 'Wage paid in shares'
  })
}

function directMint(sher: number, counterparty: string = ADDR.member) {
  return makeJournalEntryDraft({
    id: `0x${'d'.repeat(64)}-1`,
    timestamp: 200,
    useCase: 'DEFAULT-D',
    debit: 'SHERS To Be Issued',
    credit: 'Investor Equity',
    token: 'sher',
    rawAmount: raw(sher),
    counterparty,
    memo: 'Direct SHER mint — shares issued to equity'
  })
}

function mintLegs(entries: readonly JournalEntryDraft[]) {
  return entries
    .filter((entry) => entry.useCase === 'DEFAULT-D')
    .map(({ debit, rawAmount }) => ({ debit, rawAmount }))
}

describe('splitUnbackedIssuance', () => {
  it('keeps a mint that pays SHER the shareholder earned in wages', () => {
    const entries = splitUnbackedIssuance([accrual(10), directMint(10)])

    expect(mintLegs(entries)).toEqual([{ debit: 'SHERS To Be Issued', rawAmount: raw(10) }])
  })

  it('[AC-US-ACCT-005-16] books a mint to a shareholder owed no wages against Deferred SHER Compensation', () => {
    const entries = splitUnbackedIssuance([accrual(10), directMint(25, ADDR.founder)])

    expect(mintLegs(entries)).toEqual([{ debit: 'Deferred SHER Compensation', rawAmount: raw(25) }])
  })

  it('[AC-US-ACCT-005-16] splits a mint larger than the wages still owed', () => {
    const entries = splitUnbackedIssuance([accrual(10), withdrawal(4), directMint(9)])

    expect(mintLegs(entries)).toEqual([
      { debit: 'SHERS To Be Issued', rawAmount: raw(6) },
      { debit: 'Deferred SHER Compensation', rawAmount: raw(3) }
    ])
  })

  it('[AC-US-ACCT-005-16] does not let a mint absorb wages earned after it', () => {
    const entries = splitUnbackedIssuance([{ ...directMint(10), timestamp: 50 }, accrual(10)])

    expect(mintLegs(entries)).toEqual([{ debit: 'Deferred SHER Compensation', rawAmount: raw(10) }])
  })

  it('leaves a mint unbacked when a later withdrawal pays the same wage', () => {
    const entries = splitUnbackedIssuance([
      accrual(10),
      directMint(10),
      { ...withdrawal(10), timestamp: 300 }
    ])

    expect(mintLegs(entries)).toEqual([{ debit: 'Deferred SHER Compensation', rawAmount: raw(10) }])
  })

  it('lets a mint pay earlier wages while a later withdrawal pays later wages', () => {
    const entries = splitUnbackedIssuance([
      accrual(10),
      directMint(10),
      { ...accrual(10), timestamp: 300 },
      { ...withdrawal(10), timestamp: 400 }
    ])

    expect(mintLegs(entries)).toEqual([{ debit: 'SHERS To Be Issued', rawAmount: raw(10) }])
  })

  it('never lets two mints cover the same owed wage', () => {
    const entries = splitUnbackedIssuance([
      accrual(10),
      directMint(6),
      { ...directMint(6), id: `0x${'e'.repeat(64)}-1`, timestamp: 250 }
    ])

    expect(mintLegs(entries)).toEqual([
      { debit: 'SHERS To Be Issued', rawAmount: raw(6) },
      { debit: 'SHERS To Be Issued', rawAmount: raw(4) },
      { debit: 'Deferred SHER Compensation', rawAmount: raw(2) }
    ])
  })

  it('keeps both legs of a split mint in one source operation', () => {
    const entries = splitUnbackedIssuance([accrual(6), directMint(9)])
    const [owedLeg, unbackedLeg] = entries.filter((entry) => entry.useCase === 'DEFAULT-D')

    expect(unbackedLeg!.sourceOperationId).toBe(`0x${'d'.repeat(64)}`)
    expect(unbackedLeg!.id).not.toBe(owedLeg!.id)
  })
})
