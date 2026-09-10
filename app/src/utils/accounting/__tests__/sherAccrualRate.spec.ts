import { describe, it, expect } from 'vitest'
import type { Address } from 'viem'
import type { TeamContract, ContractType } from '@/types/teamContract'
import type { CncAccountingInput } from '@/utils/accounting/assemble'
import { usdAmountToNumber, usdRateToNumber } from '@/utils/accounting/monetaryAmount'
import { ADDR } from './fixtures'
import { assembleAccounting } from './assembleAccounting'

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
  sherTokenAddress: ADDR.sherToken
}

// Multiplier 1x → 6x at t = 1,000,000 s.
const EVENT_TS = 1_000_000

function claim(weekStartSeconds: number) {
  return {
    id: weekStartSeconds,
    memberAddress: ADDR.member as Address,
    weekStart: new Date(weekStartSeconds * 1000).toISOString(),
    minutesWorked: 300, // 5h × 10 SHER/h = 50 SHER
    status: 'signed',
    wage: { ratePerHour: [{ type: 'sher', amount: 10 }] }
  } as never
}

describe('SHER accrual valuation at the current multiplier', () => {
  const a = assembleAccounting({
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

  it('values every accrual at the current multiplier, whenever the SHER was earned', () => {
    const accruals = a.journal
      .filter((entry) => entry.useCase === 'UC-CASH-02')
      .sort((x, y) => x.timestamp - y.timestamp)
    expect(accruals).toHaveLength(2)
    // The current multiplier is 6x (the latest MultiplierUpdated), so both 50-SHER
    // weeks value alike — 50 SHER is 50 SHER whenever it was earned, only its USD
    // worth follows the current rate.
    for (const accrual of accruals) {
      const line = accrual.lines[0]!
      expect(line.movement?.token).toBe('sher')
      expect(usdRateToNumber(line.movement!.rate)).toBeCloseTo(1 / 6, 6)
      expect(usdAmountToNumber(line.debit ?? line.credit ?? 0n)).toBeCloseTo(50 / 6, 4)
    }
  })
})
