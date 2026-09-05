import { describe, expect, it } from 'vitest'
import type { TeamOfficerWithContracts } from '@/queries/contract.queries'
import { bankScanTargets } from '../useIncomingBankTokenTransfersViaLogs'

const FIRST_BANK = '0x1111111111111111111111111111111111111111'
const SECOND_BANK = '0x2222222222222222222222222222222222222222'

const officerHistory = [
  {
    deployBlockNumber: '101',
    contracts: [
      { address: FIRST_BANK, type: 'Bank' },
      { address: '0x3333333333333333333333333333333333333333', type: 'ExpenseAccountEIP712' }
    ]
  },
  {
    deployBlockNumber: '202',
    contracts: [{ address: SECOND_BANK, type: 'Bank' }]
  }
] as TeamOfficerWithContracts[]

describe('bankScanTargets', () => {
  it('keeps every historic Bank generation with its deploy boundary', () => {
    expect(bankScanTargets(officerHistory, SECOND_BANK)).toEqual([
      { address: FIRST_BANK, fromBlock: 101n },
      { address: SECOND_BANK, fromBlock: 202n }
    ])
  })

  it('keeps the current Bank when Officer history is unavailable', () => {
    expect(bankScanTargets([], SECOND_BANK)).toEqual([{ address: SECOND_BANK }])
  })

  it('does not duplicate a historic Bank when address casing differs', () => {
    expect(bankScanTargets(officerHistory, SECOND_BANK.toUpperCase())).toHaveLength(2)
  })
})
