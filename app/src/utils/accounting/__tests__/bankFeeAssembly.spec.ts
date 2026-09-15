import { describe, expect, it } from 'vitest'
import type { Address } from 'viem'
import type { TeamContract } from '@/types/teamContract'
import { USDC_ADDRESS } from '@/constant'
import type { CncAccountingInput } from '@/utils/accounting/assemble'
import { ADDR, usd } from './fixtures'
import { assembleAccounting } from './assembleAccounting'
import { normalizeLegacyBankFeeTokens } from '@/composables/bank/bankFees'

const LEGACY_BANK = '0x2222222222222222222222222222222222222222'

const CONTRACTS: TeamContract[] = [
  { type: 'Bank', address: ADDR.bank as Address, deployer: ADDR.founder as Address, admins: [] },
  {
    type: 'Bank',
    address: LEGACY_BANK as Address,
    deployer: ADDR.founder as Address,
    admins: []
  },
  { type: 'Safe', address: ADDR.safe as Address, deployer: ADDR.founder as Address, admins: [] }
]

const BASE: CncAccountingInput = {
  contracts: CONTRACTS,
  safeAddress: ADDR.safe,
  rateOfRecord: () => 1
}

function bankEvents(operationId: string, includeTransfer: boolean) {
  return {
    bankDeposits: { items: [] },
    bankTokenDeposits: { items: [] },
    bankTransfers: { items: [] },
    bankTokenTransfers: {
      items: includeTransfer
        ? [
            {
              id: `${operationId}-1`,
              contractAddress: ADDR.bank,
              sender: ADDR.founder,
              to: ADDR.safe,
              token: USDC_ADDRESS,
              amount: '100000000',
              timestamp: 100
            }
          ]
        : []
    },
    bankDividendDistributionTriggereds: { items: [] },
    bankFeePaids: {
      items: [
        {
          id: `${operationId}-2`,
          contractAddress: ADDR.bank,
          feeCollector: ADDR.feeCollector,
          token: USDC_ADDRESS,
          amount: '1000000',
          timestamp: 100
        }
      ]
    },
    bankOwnershipTransferreds: { items: [] },
    rawContractTokenTransfers: { items: [] }
  }
}

describe('Bank fee journal assembly', () => {
  it('assembles a Bank-to-Safe transfer and its fee as one JournalEntry', () => {
    const operationId = `0x${'d'.repeat(64)}`
    const accounting = assembleAccounting({
      ...BASE,
      bankEvents: bankEvents(operationId, true)
    })

    expect(accounting.journal).toHaveLength(1)
    expect(accounting.journal[0]).toMatchObject({
      id: operationId,
      internal: true,
      lines: [
        { account: { family: { name: 'Cash — Safe' } }, debit: usd(100) },
        { account: { family: { name: 'Transaction Fee Expense' } }, debit: usd(1) },
        { account: { family: { name: 'Cash — Bank' } }, credit: usd(101) }
      ]
    })
    expect(
      accounting.journal[0]!.lines.filter(
        (line) => line.account.family.name === 'Transaction Fee Expense'
      )
    ).toHaveLength(1)
    expect(accounting.unmatchedFeeOperationIds).toEqual([])
  })

  it('withholds an unmatched FeePaid instead of producing a fee-only JournalEntry', () => {
    const operationId = `0x${'e'.repeat(64)}`
    const accounting = assembleAccounting({
      ...BASE,
      bankEvents: bankEvents(operationId, false)
    })

    expect(accounting.journal).toEqual([])
    expect(accounting.unmatchedFeeOperationIds).toEqual([operationId])
  })

  it('assembles fees from legacy and current Bank generations against their paying Bank', () => {
    const legacyOperation = `0x${'a'.repeat(64)}`
    const currentOperation = `0x${'b'.repeat(64)}`
    const events = bankEvents(currentOperation, true)
    events.bankTokenTransfers.items.push({
      id: `${legacyOperation}-4`,
      contractAddress: LEGACY_BANK,
      sender: ADDR.founder,
      to: ADDR.safe,
      token: USDC_ADDRESS,
      amount: '50000000',
      timestamp: 90
    })
    events.bankFeePaids.items.push({
      id: `${legacyOperation}-3`,
      contractAddress: LEGACY_BANK,
      feeCollector: ADDR.feeCollector,
      token: null,
      amount: '500000',
      timestamp: 90
    })

    const accounting = assembleAccounting({
      ...BASE,
      bankEvents: normalizeLegacyBankFeeTokens(events)
    })

    expect(accounting.unmatchedFeeOperationIds).toEqual([])
    expect(accounting.journal).toHaveLength(2)
    for (const [operationId, bank] of [
      [legacyOperation, LEGACY_BANK],
      [currentOperation, ADDR.bank]
    ]) {
      const entry = accounting.journal.find((row) => row.sourceOperationId === operationId)!
      expect(entry.lines).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            account: expect.objectContaining({
              family: expect.objectContaining({ name: 'Transaction Fee Expense' })
            })
          }),
          expect.objectContaining({
            account: expect.objectContaining({
              family: expect.objectContaining({ name: 'Cash — Bank' }),
              contractAddress: bank
            })
          })
        ])
      )
    }
  })
})
