import { describe, expect, it } from 'vitest'
import type { Address } from 'viem'
import type { TeamContract } from '@/types/teamContract'
import { USDC_ADDRESS } from '@/constant'
import { assembleCncAccounting, type CncAccountingInput } from '@/utils/accounting/assemble'
import { ADDR } from './fixtures'

const CONTRACTS: TeamContract[] = [
  { type: 'Bank', address: ADDR.bank as Address, deployer: ADDR.founder as Address, admins: [] },
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
    const accounting = assembleCncAccounting({
      ...BASE,
      bankEvents: bankEvents(operationId, true)
    })

    expect(accounting.journal).toHaveLength(1)
    expect(accounting.journal[0]).toMatchObject({
      id: operationId,
      internal: false,
      lines: [
        { account: { family: { name: 'Cash — Safe' } }, debit: 100 },
        { account: { family: { name: 'Transaction Fee Expense' } }, debit: 1 },
        { account: { family: { name: 'Cash — Bank' } }, credit: 101 }
      ]
    })
    expect(accounting.entries.filter((entry) => entry.useCase === 'FEE')).toHaveLength(1)
    expect(accounting.unmatchedFeeOperationIds).toEqual([])
  })

  it('withholds an unmatched FeePaid instead of producing a fee-only JournalEntry', () => {
    const operationId = `0x${'e'.repeat(64)}`
    const accounting = assembleCncAccounting({
      ...BASE,
      bankEvents: bankEvents(operationId, false)
    })

    expect(accounting.entries).toEqual([])
    expect(accounting.journal).toEqual([])
    expect(accounting.unmatchedFeeOperationIds).toEqual([operationId])
  })
})
