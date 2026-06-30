import { describe, it, expect } from 'vitest'
import { describeEntry, entryLabel, makeNameResolver, shortenAddress } from '../describeEntry'
import type { LedgerEntry } from '../ledgerEntry'

const GEORGES = '0x1111111111111111111111111111111111111111'
const RAVI = '0x2222222222222222222222222222222222222222'
const STRANGER = '0x3333333333333333333333333333333333333333'

// Ravi is stored upper-cased on purpose, to prove the resolver is case-insensitive.
const nameOf = makeNameResolver([
  { address: GEORGES, name: 'Georges' },
  { address: RAVI.toUpperCase(), name: 'Ravi' },
  { address: '', name: 'No address' }, // skipped (no address)
  { address: STRANGER, name: null } // skipped (no name) → resolves as short address
])

/** A minimal balanced entry; override only what each case needs. */
function entry(partial: Partial<LedgerEntry>): LedgerEntry {
  return {
    id: 'e1',
    timestamp: 1_700_000_000,
    useCase: 'CASH-IN',
    debit: 'Cash — Bank',
    credit: 'Service Revenue',
    amountUsd: 500,
    token: 'usdc',
    rawAmount: '500000000',
    internal: false,
    memo: 'raw memo',
    enrichment: 'not-applicable',
    ...partial
  }
}

describe('shortenAddress', () => {
  it('truncates a full address to head…tail', () => {
    expect(shortenAddress(GEORGES)).toBe('0x1111…1111')
  })

  it('returns short input unchanged', () => {
    expect(shortenAddress('0xabc')).toBe('0xabc')
  })
})

describe('makeNameResolver', () => {
  it('resolves a member name case-insensitively', () => {
    expect(nameOf(GEORGES)).toBe('Georges')
    expect(nameOf(RAVI.toLowerCase())).toBe('Ravi')
  })

  it('falls back to a shortened address for a non-member', () => {
    expect(nameOf(STRANGER)).toBe('0x3333…3333')
  })

  it('returns an empty string for a missing address', () => {
    expect(nameOf(null)).toBe('')
    expect(nameOf(undefined)).toBe('')
  })

  it('tolerates an undefined member list', () => {
    expect(makeNameResolver(undefined)(GEORGES)).toBe('0x1111…1111')
  })
})

describe('describeEntry', () => {
  it('narrates a wage accrual with the hours worked', () => {
    expect(
      describeEntry(
        entry({ useCase: 'UC-CASH-02', counterparty: GEORGES, minutesWorked: 960 }),
        nameOf
      )
    ).toBe('Georges submitted 16h')
  })

  it('renders fractional hours with one decimal', () => {
    expect(
      describeEntry(
        entry({ useCase: 'UC-CASH-02', counterparty: GEORGES, minutesWorked: 90 }),
        nameOf
      )
    ).toBe('Georges submitted 1.5h')
  })

  it('falls back to "accrued wages" when no minutes are known', () => {
    expect(describeEntry(entry({ useCase: 'UC-CASH-02', counterparty: GEORGES }), nameOf)).toBe(
      'Georges accrued wages'
    )
  })

  it('narrates a wage settlement', () => {
    expect(
      describeEntry(
        entry({ useCase: 'UC-CASH-03', counterparty: GEORGES, minutesWorked: 960 }),
        nameOf
      )
    ).toBe('Georges was paid for 16h')
    expect(describeEntry(entry({ useCase: 'UC-CASH-03', counterparty: GEORGES }), nameOf)).toBe(
      'Georges was paid wages'
    )
  })

  it('narrates capital, revenue and investment', () => {
    expect(describeEntry(entry({ useCase: 'UC-BANK-01', counterparty: RAVI }), nameOf)).toBe(
      'Ravi contributed $500.00 in capital'
    )
    expect(describeEntry(entry({ useCase: 'UC-BANK-02', counterparty: RAVI }), nameOf)).toBe(
      'Ravi paid $500.00 for services'
    )
    expect(describeEntry(entry({ useCase: 'UC-SDR-01', counterparty: RAVI }), nameOf)).toBe(
      'Ravi invested $500.00'
    )
  })

  it('narrates a member capital contribution, adding the SHER count when known', () => {
    expect(describeEntry(entry({ useCase: 'UC-MEMBER-01', counterparty: GEORGES }), nameOf)).toBe(
      'Georges invested $500.00 in capital'
    )
    expect(
      describeEntry(entry({ useCase: 'UC-MEMBER-01', counterparty: GEORGES, shares: 120 }), nameOf)
    ).toBe('Georges invested $500.00 in capital and got 120 SHER')
  })

  it('narrates an expense reimbursement and a dividend', () => {
    expect(
      describeEntry(entry({ useCase: 'UC-EXP-01', counterparty: GEORGES, amountUsd: 80 }), nameOf)
    ).toBe("Georges's expense reimbursed — $80.00")
    expect(describeEntry(entry({ useCase: 'UC-INV-01', counterparty: RAVI }), nameOf)).toBe(
      'Dividend of $500.00 paid to Ravi'
    )
  })

  it('narrates a share issuance, falling back when no shares are set', () => {
    expect(
      describeEntry(entry({ useCase: 'DEFAULT-D', counterparty: RAVI, shares: 120 }), nameOf)
    ).toBe('120 SHER issued to Ravi')
    expect(describeEntry(entry({ useCase: 'DEFAULT-D', counterparty: RAVI }), nameOf)).toBe(
      'Share issuance'
    )
  })

  it('uses the shortened address when the counterparty is not a member', () => {
    expect(describeEntry(entry({ useCase: 'UC-SDR-01', counterparty: STRANGER }), nameOf)).toBe(
      '0x3333…3333 invested $500.00'
    )
  })

  it('keeps the generic label for entries with no human actor', () => {
    expect(describeEntry(entry({ useCase: 'FEE', counterparty: RAVI }), nameOf)).toBe(
      'Protocol fee'
    )
    expect(describeEntry(entry({ useCase: 'INTERNAL', counterparty: RAVI }), nameOf)).toBe(
      'Internal transfer'
    )
  })

  it('falls back to the generic label when there is no counterparty', () => {
    expect(describeEntry(entry({ useCase: 'UC-BANK-01' }), nameOf)).toBe(
      'Owner capital contribution'
    )
  })
})

describe('entryLabel', () => {
  it('maps each use case to its generic label', () => {
    expect(entryLabel(entry({ useCase: 'CASH-OUT' }))).toBe('Cash payment')
    expect(entryLabel(entry({ useCase: 'UC-BANK-03' }))).toBe('Treasury funding')
  })
})
