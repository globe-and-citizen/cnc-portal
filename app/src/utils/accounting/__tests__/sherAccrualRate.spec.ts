import { describe, it, expect } from 'vitest'
import type { Address } from 'viem'
import type { TeamContract, ContractType } from '@/types/teamContract'
import { assembleCncAccounting, type CncAccountingInput } from '@/utils/accounting/assemble'
import { ADDR } from './fixtures'

const ROUTER = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
const DEPLOYER = ADDR.founder as Address

const CONTRACTS: TeamContract[] = (
  [
    ['Bank', ADDR.bank],
    ['CashRemunerationEIP712', ADDR.payroll],
    ['Safe', ADDR.safe],
    ['SafeDepositRouter', ROUTER]
  ] as [ContractType, string][]
).map(([type, address]) => ({ type, address: address as Address, deployer: DEPLOYER, admins: [] }))

const BASE: CncAccountingInput = {
  contracts: CONTRACTS,
  safeAddress: ADDR.safe,
  founderAddresses: [ADDR.founder],
  sherTokenAddress: ADDR.sherToken,
  safeDepositRouterAddress: ROUTER
}

// Multiplier 1x → 6x at t = 1,000,000 s.
const EVENT_TS = 1_000_000

function claim(weekStartSeconds: number) {
  return {
    memberAddress: ADDR.member as Address,
    weekStart: new Date(weekStartSeconds * 1000).toISOString(),
    minutesWorked: 300, // 5h × 10 SHER/h = 50 SHER
    status: 'signed',
    wage: { ratePerHour: [{ type: 'sher', amount: 10 }] }
  } as never
}

describe('SHER accrual valuation across a multiplier change', () => {
  const a = assembleCncAccounting({
    ...BASE,
    safeDepositRouterEvents: {
      safeDeposits: { items: [] },
      safeDepositsEnableds: { items: [] },
      safeDepositsDisableds: { items: [] },
      safeAddressUpdateds: { items: [] },
      safeMultiplierUpdateds: {
        items: [
          {
            id: 'mu1',
            contractAddress: ROUTER,
            oldMultiplier: '1000000', // 1x
            newMultiplier: '6000000', // 6x
            timestamp: EVENT_TS
          }
        ]
      }
    },
    weeklyClaims: [
      claim(0), // weekEnd = 561,600 s — BEFORE the change
      claim(EVENT_TS) // weekEnd = 1,561,600 s — AFTER the change
    ]
  })

  it('values each accrual at the multiplier of its own week', () => {
    const accruals = a.entries
      .filter((e) => e.useCase === 'UC-CASH-02' && e.token === 'sher')
      .sort((x, y) => x.timestamp - y.timestamp)
    expect(accruals).toHaveLength(2)
    expect(accruals[0].rate).toBeCloseTo(1, 6) // week ended before the change → 1x
    expect(accruals[0].amountUsd).toBeCloseTo(50, 6)
    expect(accruals[1].rate).toBeCloseTo(1 / 6, 6) // week ended after the change → 6x
    expect(accruals[1].amountUsd).toBeCloseTo(50 / 6, 4)
  })
})
