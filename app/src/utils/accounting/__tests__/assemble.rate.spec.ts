import { describe, expect, it } from 'vitest'
import type { Address } from 'viem'
import { buildAccountingSummary } from '@/utils/accounting/accountingSummary'
import { ADDR, usd } from './fixtures'
import { assembleAccounting } from './assembleAccounting'

const bankEvents = {
  bankDeposits: {
    items: [
      {
        id: 'bd1',
        contractAddress: ADDR.bank,
        depositor: ADDR.client,
        amount: '1000000000000000000',
        timestamp: 100
      }
    ]
  },
  bankTokenDeposits: { items: [] },
  bankTransfers: { items: [] },
  bankTokenTransfers: { items: [] },
  bankDividendDistributionTriggereds: { items: [] },
  bankFeePaids: { items: [] },
  bankOwnershipTransferreds: { items: [] },
  rawContractTokenTransfers: { items: [] }
}

describe('accounting rate assembly', () => {
  it('honours an injected rate of record and defaults native/SHER to zero', () => {
    const input = {
      contracts: [
        {
          type: 'Bank' as const,
          address: ADDR.bank as Address,
          deployer: ADDR.founder as Address,
          admins: []
        }
      ],
      bankEvents
    }
    const withRate = assembleAccounting({ ...input, rateOfRecord: () => 2 })
    expect(buildAccountingSummary(withRate.journal).income).toBe(usd(2))

    const phase1 = assembleAccounting({ ...input, rateOfRecord: () => 0 })
    expect(buildAccountingSummary(phase1.journal).income).toBe(0n)
  })
})
