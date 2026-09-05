import { describe, expect, it } from 'vitest'
import type { Address, Hex } from 'viem'
import type { TeamContract } from '@/types/teamContract'
import { assembleWithAccountEvidence } from '@/utils/accounting/assemble'
import {
  knownDeploymentAccounts,
  resolveAccountInstances,
  transfersFromReceiptLogs,
  type TransactionAccountEvidence
} from '@/utils/accounting/accountInstances'
import { makeEntry, type LedgerEntry } from '@/utils/accounting/ledgerEntry'

const BANK = '0x1111111111111111111111111111111111111111' as Address
const BANK_2 = '0x2222222222222222222222222222222222222222' as Address
const PAYROLL = '0x3333333333333333333333333333333333333333' as Address
const EXPENSE = '0x4444444444444444444444444444444444444444' as Address
const CREDIT = '0x5555555555555555555555555555555555555555' as Address
const SAFE = '0x6666666666666666666666666666666666666666' as Address
const EXTERNAL = '0x7777777777777777777777777777777777777777' as Address

const HASH_BANK_IN = `0x${'a'.repeat(64)}`
const HASH_BANK_OUT = `0x${'b'.repeat(64)}`
const HASH_PAYROLL = `0x${'c'.repeat(64)}`
const HASH_EXPENSE = `0x${'d'.repeat(64)}`
const HASH_CREDIT = `0x${'e'.repeat(64)}`

const contracts: TeamContract[] = [
  { address: BANK, type: 'Bank', deployer: EXTERNAL, admins: [] },
  { address: BANK_2, type: 'Bank', deployer: EXTERNAL, admins: [] },
  { address: PAYROLL, type: 'CashRemunerationEIP712', deployer: EXTERNAL, admins: [] },
  { address: EXPENSE, type: 'ExpenseAccountEIP712', deployer: EXTERNAL, admins: [] },
  { address: CREDIT, type: 'FixedReturn', deployer: EXTERNAL, admins: [] },
  { address: SAFE, type: 'Safe', deployer: EXTERNAL, admins: [] }
]

function posting(
  id: string,
  fields: Pick<LedgerEntry, 'debit' | 'credit'> & Partial<LedgerEntry>
): LedgerEntry {
  return makeEntry({
    id,
    timestamp: 1,
    useCase: 'INTERNAL',
    debit: fields.debit,
    credit: fields.credit,
    amountUsd: 1,
    token: 'usdc',
    rawAmount: '1000000',
    internal: true,
    memo: 'Test movement',
    ...fields
  })
}

const topicFor = (address: Address): Hex => `0x${address.slice(2).padStart(64, '0')}` as Hex

describe('deployment account evidence', () => {
  const accounts = knownDeploymentAccounts(contracts)

  it('indexes every and only deployment-scoped cash family', () => {
    expect([...accounts.entries()]).toEqual([
      [BANK.toLowerCase(), 'Cash — Bank'],
      [BANK_2.toLowerCase(), 'Cash — Bank'],
      [PAYROLL.toLowerCase(), 'Cash — Payroll'],
      [EXPENSE.toLowerCase(), 'Cash — Expense'],
      [CREDIT.toLowerCase(), 'Cash — Credit']
    ])
    expect(accounts.has(SAFE.toLowerCase())).toBe(false)
  })

  it('decodes ERC-20 Transfer directions without treating unrelated receipt logs as evidence', () => {
    const transfers = transfersFromReceiptLogs([
      {
        topics: [
          '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
          topicFor(CREDIT),
          topicFor(BANK)
        ],
        data: `0x${'0'.repeat(63)}1`
      },
      { topics: ['0x1234'], data: '0x' }
    ])

    expect(transfers).toEqual([{ from: CREDIT, to: BANK }])
  })

  it('resolves every deployment family only from a matching receipt transfer direction', () => {
    const entries = [
      posting('bank-in', { debit: 'Cash — Bank', credit: 'Loan Payable', txHash: HASH_BANK_IN }),
      posting('bank-out', { debit: 'Loan Payable', credit: 'Cash — Bank', txHash: HASH_BANK_OUT }),
      posting('payroll-out', {
        debit: 'Wage Payable',
        credit: 'Cash — Payroll',
        txHash: HASH_PAYROLL
      }),
      posting('expense-in', {
        debit: 'Cash — Expense',
        credit: 'Owner Capital',
        txHash: HASH_EXPENSE
      }),
      posting('credit-in', {
        debit: 'Cash — Credit',
        credit: 'Owner Capital',
        txHash: HASH_CREDIT
      })
    ]
    const evidence: TransactionAccountEvidence = new Map([
      [HASH_BANK_IN, [{ from: CREDIT, to: BANK }]],
      [HASH_BANK_OUT, [{ from: BANK, to: CREDIT }]],
      [HASH_PAYROLL, [{ from: PAYROLL, to: EXTERNAL }]],
      [HASH_EXPENSE, [{ from: EXTERNAL, to: EXPENSE }]],
      [HASH_CREDIT, [{ from: BANK, to: CREDIT }]]
    ])

    const resolved = resolveAccountInstances(entries, accounts, evidence)

    expect(resolved.map((entry) => [entry.debitInstance, entry.creditInstance])).toEqual([
      [BANK, undefined],
      [undefined, BANK],
      [undefined, PAYROLL],
      [EXPENSE, undefined],
      [CREDIT, undefined]
    ])

    const books = assembleWithAccountEvidence(entries, accounts, evidence)
    expect(
      books.accountRegistry.accounts.filter((account) => account.contractAddress)
    ).toHaveLength(4)
    expect(
      books.journal.find((entry) => entry.id === HASH_BANK_IN)?.lines[0].account
    ).toMatchObject({
      contractAddress: BANK,
      resolution: 'resolved'
    })
  })

  it('rejects an unverified direct address and does not select a generation when receipt evidence is ambiguous', () => {
    const entries = [
      posting('external-bank', {
        debit: 'Operating Expense',
        credit: 'Cash — Bank',
        creditInstance: EXTERNAL
      }),
      posting('ambiguous-bank', {
        debit: 'Cash — Bank',
        credit: 'Loan Payable',
        txHash: HASH_BANK_IN
      }),
      posting('native-sweep', { debit: 'Cash — Bank', credit: 'Cash — Payroll' })
    ]
    const evidence: TransactionAccountEvidence = new Map([
      [
        HASH_BANK_IN,
        [
          { from: CREDIT, to: BANK },
          { from: CREDIT, to: BANK_2 }
        ]
      ]
    ])

    const resolved = resolveAccountInstances(entries, accounts, evidence)

    expect(resolved[0].creditInstance).toBeUndefined()
    expect(resolved[1].debitInstance).toBeUndefined()
    expect(resolved[2].debitInstance).toBeUndefined()
    expect(resolved[2].creditInstance).toBeUndefined()
  })
})
