import { describe, expect, it } from 'vitest'
import { accountNet, accountOpening, entriesForAccount } from '@/utils/accounting/accountLedger'
import { buildGeneralLedger, buildJournal } from '@/utils/accounting/generalLedger'
import { journalLedgerRows } from '@/utils/accounting/journalLedgerPresenter'
import { money } from '@/utils/accounting/presenter'
import type { LedgerEntry } from '@/utils/accounting/ledgerEntry'
import type { Address } from 'viem'

const BANK1 = '0x1111111111111111111111111111111111111111' as Address
const BANK2 = '0x2222222222222222222222222222222222222222' as Address
const TRANSFER_TX_HASH = `0x${'a'.repeat(64)}`

function entry(over: Partial<LedgerEntry> & Pick<LedgerEntry, 'id'>): LedgerEntry {
  return {
    timestamp: 100,
    useCase: 'UC-BANK-02',
    debit: null,
    credit: null,
    amountUsd: 0,
    token: 'usdc',
    rawAmount: '0',
    internal: false,
    memo: '',
    enrichment: 'not-applicable',
    ...over
  }
}

function migrationBook(): LedgerEntry[] {
  return [
    entry({
      id: 'seed1',
      timestamp: 50,
      debit: 'Cash — Bank',
      debitInstance: BANK1,
      credit: 'Service Revenue',
      amountUsd: 200
    }),
    entry({
      id: 'seed2',
      timestamp: 90,
      debit: 'Cash — Bank',
      debitInstance: BANK2,
      credit: 'Service Revenue',
      amountUsd: 10
    }),
    entry({
      id: `${TRANSFER_TX_HASH}-5`,
      timestamp: 100,
      useCase: 'UC-BANK-03',
      debit: 'Cash — Bank',
      debitInstance: BANK2,
      credit: 'Cash — Bank',
      creditInstance: BANK1,
      amountUsd: 100,
      internal: true
    }),
    entry({
      id: `${TRANSFER_TX_HASH}-3`,
      timestamp: 100,
      useCase: 'FEE',
      debit: 'Transaction Fee Expense',
      credit: 'Cash — Bank',
      creditInstance: BANK1,
      amountUsd: 0.5
    })
  ]
}

describe('accountLedger — concrete redeployed accounts', () => {
  const journal = buildJournal(migrationBook())
  const generalLedger = buildGeneralLedger(journal)
  const bank = (address: Address) =>
    generalLedger.trialBalance.find(
      (row) => row.account.contractAddress?.toLowerCase() === address.toLowerCase()
    )!.account

  it('nets each deployment independently from its concrete Account identity', () => {
    const bank1 = bank(BANK1)
    const bank2 = bank(BANK2)

    expect(accountNet(entriesForAccount(journal, bank1), bank1)).toBe(99.5)
    expect(accountNet(entriesForAccount(journal, bank2), bank2)).toBe(110)
  })

  it('reconciles each JournalEntry drill-down with its Trial Balance line', () => {
    const bank1 = bank(BANK1)
    const bank2 = bank(BANK2)
    const bank1Entries = entriesForAccount(journal, bank1)
    const bank2Entries = entriesForAccount(journal, bank2)

    expect(money(accountNet(bank1Entries, bank1))).toBe(money(99.5))
    expect(money(accountNet(bank2Entries, bank2))).toBe(money(110))
  })

  it('shows the complete transfer JournalEntry, including its fee, from either side', () => {
    const sender = journalLedgerRows(entriesForAccount(journal, bank(BANK1)), journal)
    const recipient = journalLedgerRows(entriesForAccount(journal, bank(BANK2)), journal)

    expect(sender.some((row) => row.account === 'Transaction Fee Expense')).toBe(true)
    expect(recipient.some((row) => row.account === 'Transaction Fee Expense')).toBe(true)
  })

  it('brings forward only the selected deployment', () => {
    const opening = accountOpening(journal, bank(BANK1), new Date(95 * 1000))
    expect(opening.balance).toBe(200)
    expect(opening.debits).toBe(200)
  })
})
