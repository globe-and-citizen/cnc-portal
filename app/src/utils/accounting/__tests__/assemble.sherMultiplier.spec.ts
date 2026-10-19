import { describe, expect, it } from 'vitest'
import type { Address } from 'viem'
import type { ContractType, TeamContract } from '@/types/teamContract'
import { assembleAccounting } from './assembleAccounting'
import { ADDR, usd } from './fixtures'

const ROUTER = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
const INVESTOR = '0xcccccccccccccccccccccccccccccccccccccccc'

const contracts: TeamContract[] = (
  [
    ['SafeDepositRouter', ROUTER],
    ['InvestorV1', INVESTOR]
  ] as [ContractType, string][]
).map(([type, address]) => ({
  address: address as Address,
  type,
  deployer: ADDR.founder as Address,
  admins: []
}))

describe('SHER valuation during accounting assembly', () => {
  it('[AC-US-ACCT-005-10] values SHER from its constructor multiplier when no change event exists', () => {
    const accounting = assembleAccounting({
      contracts,
      sherTokenAddress: ADDR.sherToken,
      // The router constructor sets this value; there is no MultiplierUpdated event.
      currentSherMultiplier: 4,
      safeDepositRouterEvents: {
        safeDeposits: { items: [] },
        safeDepositsEnableds: { items: [] },
        safeDepositsDisableds: { items: [] },
        safeAddressUpdateds: { items: [] },
        safeMultiplierUpdateds: { items: [] }
      },
      investorEvents: {
        investorMints: {
          items: [
            {
              id: 'constructor-multiplier-mint',
              contractAddress: INVESTOR,
              shareholder: ADDR.member,
              amount: '2000000', // 2 SHER at 4x = $0.50
              timestamp: 150
            }
          ]
        },
        investorDividendDistributeds: { items: [] },
        investorDividendPaids: { items: [] },
        investorDividendPaymentFaileds: { items: [] }
      }
    })

    const issued = accounting.journal.find((entry) => entry.useCase === 'DEFAULT-D')
    expect(issued?.lines.map((line) => line.debit || line.credit)).toEqual([usd(0.5), usd(0.5)])
    expect(issued?.lines.map((line) => line.account.family.name)).toEqual([
      'SHERS To Be Issued',
      'Investor Equity'
    ])
  })
})
