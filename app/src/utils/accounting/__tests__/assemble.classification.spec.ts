import { describe, it, expect } from 'vitest'
import type { Address } from 'viem'
import type { TeamContract, ContractType } from '@/types/teamContract'
import type { TransactionClassificationRecord } from '@/types/accounting-classification'
import type { ClassificationCategory } from '@/utils/accounting/classification'
import type { CncAccountingInput } from '@/utils/accounting/assemble'
import type { UsdRateOfRecord } from '@/utils/accounting/toUsd'
import { USDC_ADDRESS } from '@/constant'
import { ADDR } from './fixtures'
import { assembleAccounting } from './assembleAccounting'

const DEPLOYER = ADDR.founder as Address

const CONTRACTS: TeamContract[] = (
  [
    ['Bank', ADDR.bank],
    ['CashRemunerationEIP712', ADDR.payroll],
    ['ExpenseAccountEIP712', ADDR.expense],
    ['Safe', ADDR.safe]
  ] as [ContractType, string][]
).map(([type, address]) => ({ type, address: address as Address, deployer: DEPLOYER, admins: [] }))

const RATE: UsdRateOfRecord = (tokenId) => (tokenId === 'native' ? 2 : tokenId === 'sher' ? 0.5 : 1)

const BASE: CncAccountingInput = {
  contracts: CONTRACTS,
  safeAddress: ADDR.safe,
  feeCollectorAddress: ADDR.feeCollector,
  rateOfRecord: RATE
}

/** A client USDC deposit into Bank — inferred as $100 of Service Revenue. */
const clientBankDeposit: CncAccountingInput['bankEvents'] = {
  bankDeposits: { items: [] },
  bankTokenDeposits: {
    items: [
      {
        id: 'bd1',
        contractAddress: ADDR.bank,
        depositor: ADDR.client,
        token: USDC_ADDRESS,
        amount: '100000000', // 100 USDC
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
}

function classification(
  txId: string,
  category: ClassificationCategory
): TransactionClassificationRecord {
  return {
    id: 1,
    teamId: 1,
    txId,
    category,
    memo: null,
    classifiedByAddress: ADDR.founder,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  }
}

describe('accounting assembly — legacy manual classification', () => {
  it('preserves the saved withdrawal identity and memo when refreshing or reverting the journal', () => {
    const txHash = `0x${'f'.repeat(64)}`
    const sourceId = `${txHash}-4`
    const bankEvents: CncAccountingInput['bankEvents'] = {
      ...clientBankDeposit,
      bankTokenDeposits: { items: [] },
      bankTokenTransfers: {
        items: [
          {
            id: sourceId,
            contractAddress: ADDR.bank,
            to: ADDR.client,
            token: USDC_ADDRESS,
            amount: '100000000',
            timestamp: 100
          }
        ]
      }
    }
    const input = {
      ...BASE,
      bankEvents,
      classifications: [
        { ...classification(sourceId, 'SHAREHOLDER_LOAN'), memo: 'Repay principal' }
      ]
    }
    const saved = assembleAccounting(input)
    const refreshed = assembleAccounting(input)
    expect(refreshed.journal).toEqual(saved.journal)
    expect(saved.journal[0]).toMatchObject({
      id: txHash,
      legacyClassification: {
        editable: true,
        targets: [
          { sourceEntryId: sourceId, category: 'SHAREHOLDER_LOAN', memo: 'Repay principal' }
        ]
      }
    })
    expect(saved.journal[0]!.lines[0]).toMatchObject({
      account: { family: { name: 'Loan Payable' } },
      debit: 100
    })

    const reverted = assembleAccounting({ ...input, classifications: [] })
    expect(reverted.journal[0]!.legacyClassification?.targets).toEqual([
      { sourceEntryId: sourceId }
    ])
    expect(reverted.journal[0]!.lines[0]).toMatchObject({
      account: { family: { name: 'Operating Expense' } },
      debit: 100
    })
    expect(reverted.generalLedger.balanced).toBe(true)
  })

  it('infers the deposit as Service Revenue with no classification', () => {
    const a = assembleAccounting({ ...BASE, bankEvents: clientBankDeposit })
    expect(a.summary.income).toBe(100)
    expect(a.incomeStatement.revenue).toContainEqual({ account: 'Service Revenue', amount: 100 })
    expect(a.balanceSheet.balanced).toBe(true)
  })

  it('keeps a direct deposit as revenue despite an owner-capital category', () => {
    const a = assembleAccounting({
      ...BASE,
      bankEvents: clientBankDeposit,
      classifications: [classification('bd1', 'OWNER_CAPITAL')]
    })

    expect(a.summary.income).toBe(100)
    expect(a.incomeStatement.revenue).toContainEqual({ account: 'Service Revenue', amount: 100 })
    expect(a.balanceSheet.totalLiabilities).toBe(0)
    expect(a.entries.find((entry) => entry.id === 'bd1')).not.toHaveProperty('classified')
    expect(a.generalLedger.balanced).toBe(true)
    expect(a.balanceSheet.balanced).toBe(true)
  })

  it('keeps a guaranteed-internal move internal despite a revenue classification', () => {
    const internalDeposit: CncAccountingInput['bankEvents'] = {
      ...clientBankDeposit,
      bankDeposits: {
        items: [
          {
            id: 'bd-int',
            contractAddress: ADDR.bank,
            depositor: ADDR.safe,
            amount: '1000000000000000000',
            timestamp: 100
          }
        ]
      },
      bankTokenDeposits: { items: [] }
    }

    const a = assembleAccounting({
      ...BASE,
      bankEvents: internalDeposit,
      classifications: [classification('bd-int', 'REVENUE')]
    })

    expect(a.summary.income).toBe(0)
    const entry = a.entries.find((e) => e.id === 'bd-int')
    expect(entry).toMatchObject({ useCase: 'INTERNAL', internal: true })
    expect(entry?.classified).toBeUndefined()
    expect(a.balanceSheet.balanced).toBe(true)
  })
})
