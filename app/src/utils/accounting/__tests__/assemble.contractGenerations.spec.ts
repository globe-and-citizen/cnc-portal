import { describe, it, expect } from 'vitest'
import type { Address } from 'viem'
import type { TeamContract, ContractType } from '@/types/teamContract'
import type { CashRemunerationWithdrawTokenRow } from '@/types/contract-events/cash-remuneration'
import type { CncAccountingInput } from '@/utils/accounting/assemble'
import { buildBalanceSheet } from '@/utils/accounting/balanceSheet'
import { buildGeneralLedger } from '@/utils/accounting/generalLedger'
import { USDC_ADDRESS } from '@/constant'
import { ADDR, usd } from './fixtures'
import { assembleAccounting } from './assembleAccounting'

const PREVIOUS_PAYROLL = '0x3030303030303030303030303030303030303030'
const PREVIOUS_INVESTOR = '0xc0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0'
const CURRENT_INVESTOR = '0xcccccccccccccccccccccccccccccccccccccccc'
const WEEK_START_SECONDS = 1_000_000
const WITHDRAWN_AT = WEEK_START_SECONDS + 8 * 24 * 60 * 60

/** Contracts of a team whose Officer redeployed Payroll and the SHER-issuing Investor. */
const CONTRACTS: TeamContract[] = (
  [
    ['Bank', ADDR.bank],
    ['CashRemunerationEIP712', PREVIOUS_PAYROLL],
    ['InvestorV1', PREVIOUS_INVESTOR],
    ['CashRemunerationEIP712', ADDR.payroll],
    ['Investor', CURRENT_INVESTOR]
  ] as [ContractType, string][]
).map(([type, address]) => ({
  type,
  address: address as Address,
  deployer: ADDR.founder as Address,
  admins: []
}))

/** One 25-hour week paid 9 USDC + 9 SHER an hour: $225 of cash wage and 225 SHER. */
const WEEKLY_CLAIM = {
  id: 1,
  status: 'withdrawn',
  memberAddress: ADDR.member as Address,
  weekStart: new Date(WEEK_START_SECONDS * 1000).toISOString(),
  minutesWorked: 25 * 60,
  wage: {
    maximumHoursPerWeek: 40,
    ratePerHour: [
      { type: 'usdc', amount: 9 },
      { type: 'sher', amount: 9 }
    ]
  }
}

function withdrawToken(id: string, tokenAddress: string): CashRemunerationWithdrawTokenRow {
  return {
    id,
    contractAddress: PREVIOUS_PAYROLL,
    withdrawer: ADDR.member,
    tokenAddress,
    amount: '225000000',
    timestamp: WITHDRAWN_AT
  }
}

const INPUT: CncAccountingInput = {
  contracts: CONTRACTS,
  sherTokenAddress: CURRENT_INVESTOR,
  rateOfRecord: () => 1,
  weeklyClaims: [WEEKLY_CLAIM as never],
  cashRemunerationEvents: {
    cashRemunerationDeposits: { items: [] },
    cashRemunerationWithdraws: { items: [] },
    cashRemunerationWithdrawTokens: {
      items: [
        withdrawToken('usdc-withdraw', USDC_ADDRESS),
        withdrawToken('sher-withdraw', PREVIOUS_INVESTOR)
      ]
    },
    cashRemunerationWageClaims: { items: [] },
    cashRemunerationOwnerTreasuryWithdrawNatives: { items: [] },
    cashRemunerationOwnerTreasuryWithdrawTokens: { items: [] },
    cashRemunerationOfficerUpdateds: { items: [] },
    cashRemunerationTokenSupportAddeds: { items: [] },
    cashRemunerationTokenSupportRemoveds: { items: [] }
  }
}

describe('accounting across redeployed contract generations', () => {
  it('[AC-US-ACCT-005-14] books a wage withdrawn in the SHER of a previous Investor generation', () => {
    const { journal } = assembleAccounting(INPUT)

    const shareSettlement = journal.find(
      (entry) =>
        entry.useCase === 'UC-CASH-03' &&
        entry.lines.some((line) => line.account.family.name === 'Investor Equity')
    )
    expect(shareSettlement?.lines).toMatchObject([
      { account: { family: { name: 'SHERS To Be Issued' } }, movement: { token: 'sher' } },
      { account: { family: { name: 'Investor Equity' } }, movement: { token: 'sher' } }
    ])
  })

  it('settles the withdrawn week so no wage stays payable', () => {
    const { journal } = assembleAccounting(INPUT)
    const balance = buildBalanceSheet(journal)

    const wagePayable = balance.liabilities.find(
      (line) => line.account.family.name === 'Wage Payable'
    )
    expect(wagePayable?.balance ?? 0n).toBe(usd(0))
    expect(balance.balanced).toBe(true)
    expect(buildGeneralLedger(journal).balanced).toBe(true)
  })
})
