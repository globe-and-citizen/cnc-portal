import { describe, it, expect } from 'vitest'
import type { Address } from 'viem'
import type { TeamContract, ContractType } from '@/types/teamContract'
import type { CncAccountingInput } from '@/utils/accounting/assemble'
import { buildAccountingSummary } from '@/utils/accounting/accountingSummary'
import { buildBalanceSheet } from '@/utils/accounting/balanceSheet'
import { buildGeneralLedger } from '@/utils/accounting/generalLedger'
import { buildIncomeStatement } from '@/utils/accounting/incomeStatement'
import type { UsdRateOfRecord } from '@/utils/accounting/toUsd'
import { USDC_ADDRESS } from '@/constant'
import { ADDR, usd } from './fixtures'
import { assembleAccounting } from './assembleAccounting'

const ROUTER = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
const INVESTOR = '0xcccccccccccccccccccccccccccccccccccccccc'
const DEPLOYER = ADDR.founder as Address
const SAFE_DEPOSIT_TX = `0x${'d'.repeat(64)}`

/** Minimal `TeamContract` rows covering the team's money pockets. */
const CONTRACTS: TeamContract[] = (
  [
    ['Bank', ADDR.bank],
    ['CashRemunerationEIP712', ADDR.payroll],
    ['ExpenseAccountEIP712', ADDR.expense],
    ['Safe', ADDR.safe],
    ['SafeDepositRouter', ROUTER],
    ['InvestorV1', INVESTOR]
  ] as [ContractType, string][]
).map(([type, address]) => ({ type, address: address as Address, deployer: DEPLOYER, admins: [] }))

/** Stub rate of record: native $2, SHER $0.50 (USDC is pegged $1 by toUsd). */
const RATE: UsdRateOfRecord = (tokenId) => (tokenId === 'native' ? 2 : tokenId === 'sher' ? 0.5 : 1)

/** Common context for the assembled team (USDC token + fee collector). */
const BASE: CncAccountingInput = {
  contracts: CONTRACTS,
  safeAddress: ADDR.safe,
  sherTokenAddress: ADDR.sherToken,
  rateOfRecord: RATE
}

describe('accounting assembly boundary', () => {
  it('returns an empty, balanced result for no feeds', () => {
    const a = assembleAccounting({})
    expect(a.journal).toEqual([])
    expect(buildAccountingSummary(a.journal)).toMatchObject({
      cash: 0n,
      income: 0n,
      expense: 0n,
      equity: 0n
    })
    expect(buildGeneralLedger(a.journal).balanced).toBe(true)
    expect(buildBalanceSheet(a.journal).balanced).toBe(true)
    expect(buildIncomeStatement(a.journal).netIncome).toBe(0n)
  })

  it('books a client USDC deposit into Bank as Service Revenue', () => {
    const a = assembleAccounting({
      ...BASE,
      bankEvents: {
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
    })

    expect(buildAccountingSummary(a.journal).income).toBe(usd(100))
    expect(buildIncomeStatement(a.journal).revenue).toContainEqual({
      account: 'Service Revenue',
      amount: usd(100)
    })
    expect(buildGeneralLedger(a.journal).balanced).toBe(true)
    expect(buildBalanceSheet(a.journal).balanced).toBe(true)
  })

  it('collapses the cross-contract internal-transfer twin (Bank → Payroll)', () => {
    const txHash = `0x${'1'.repeat(64)}`
    const a = assembleAccounting({
      ...BASE,
      // Same native move indexed twice: Bank `Transfer` out and CashRem `Deposited`.
      bankEvents: {
        bankDeposits: { items: [] },
        bankTokenDeposits: { items: [] },
        bankTransfers: {
          items: [
            {
              id: `${txHash}-1`,
              contractAddress: ADDR.bank,
              sender: ADDR.bank,
              to: ADDR.payroll,
              amount: '1000000000000000000',
              timestamp: 130
            }
          ]
        },
        bankTokenTransfers: { items: [] },
        bankDividendDistributionTriggereds: { items: [] },
        bankFeePaids: { items: [] },
        bankOwnershipTransferreds: { items: [] },
        rawContractTokenTransfers: { items: [] }
      },
      cashRemunerationEvents: {
        cashRemunerationDeposits: {
          items: [
            {
              id: `${txHash}-2`,
              contractAddress: ADDR.payroll,
              depositor: ADDR.bank,
              amount: '1000000000000000000',
              timestamp: 130
            }
          ]
        },
        cashRemunerationWithdraws: { items: [] },
        cashRemunerationWithdrawTokens: { items: [] },
        cashRemunerationWageClaims: { items: [] },
        cashRemunerationOwnerTreasuryWithdrawNatives: { items: [] },
        cashRemunerationOwnerTreasuryWithdrawTokens: { items: [] },
        cashRemunerationOfficerUpdateds: { items: [] },
        cashRemunerationTokenSupportAddeds: { items: [] },
        cashRemunerationTokenSupportRemoveds: { items: [] }
      }
    })

    const internal = a.journal.filter(
      (entry) =>
        entry.internal &&
        entry.lines.some((line) => line.account.family.name === 'Cash — Payroll') &&
        entry.lines.some((line) => line.account.family.name === 'Cash — Bank')
    )
    expect(internal).toHaveLength(1) // the twin was deduped
    expect(buildGeneralLedger(a.journal).balanced).toBe(true)
  })

  it('enriches a wage settlement with its off-chain Payroll category', () => {
    const a = assembleAccounting({
      ...BASE,
      cashRemunerationEvents: {
        cashRemunerationDeposits: { items: [] },
        cashRemunerationWithdraws: { items: [] },
        cashRemunerationWithdrawTokens: {
          items: [
            {
              id: 'c1',
              contractAddress: ADDR.payroll,
              withdrawer: ADDR.member,
              tokenAddress: USDC_ADDRESS,
              amount: '50000000', // 50 USDC
              timestamp: 140
            }
          ]
        },
        cashRemunerationWageClaims: { items: [] },
        cashRemunerationOwnerTreasuryWithdrawNatives: { items: [] },
        cashRemunerationOwnerTreasuryWithdrawTokens: { items: [] },
        cashRemunerationOfficerUpdateds: { items: [] },
        cashRemunerationTokenSupportAddeds: { items: [] },
        cashRemunerationTokenSupportRemoveds: { items: [] }
      },
      weeklyClaims: [
        {
          memberAddress: ADDR.member as Address,
          weekStart: new Date(140 * 1000).toISOString(),
          minutesWorked: 120,
          wage: { ratePerHour: [{ type: 'usdc', amount: 25 }] },
          claims: [{ memo: 'sprint work' }]
        } as never
      ]
    })

    const payroll = a.journal.find((entry) => entry.useCase === 'UC-CASH-03')
    expect(payroll?.category).toBe('Payroll')
    expect(payroll?.memo).toContain('sprint work')
  })

  it('books an investment via the SafeDepositRouter as Investor Equity', () => {
    const a = assembleAccounting({
      ...BASE,
      safeDepositRouterEvents: {
        safeDeposits: {
          items: [
            {
              id: `${SAFE_DEPOSIT_TX}-3`,
              txHash: SAFE_DEPOSIT_TX,
              contractAddress: ROUTER,
              depositor: ADDR.client,
              token: USDC_ADDRESS,
              tokenAmount: '2000000', // 2 USDC
              sherAmount: '4000000',
              timestamp: 150
            }
          ]
        },
        safeDepositsEnableds: { items: [] },
        safeDepositsDisableds: { items: [] },
        safeAddressUpdateds: { items: [] },
        safeMultiplierUpdateds: { items: [] }
      },
      // The Safe service observes the token transfer too. It is evidence for the
      // same transaction, not a second direct Service Revenue deposit.
      safeTransfers: [
        {
          type: 'ERC20_TRANSFER',
          executionDate: new Date(150 * 1000).toISOString(),
          blockNumber: 150,
          transactionHash: SAFE_DEPOSIT_TX,
          to: ADDR.safe,
          from: ADDR.client,
          value: '2000000',
          tokenAddress: USDC_ADDRESS
        }
      ],
      // The matching mint must NOT be double-booked as equity.
      investorEvents: {
        investorMints: {
          items: [
            {
              id: 'm1',
              contractAddress: INVESTOR,
              shareholder: ADDR.client,
              amount: '4000000',
              timestamp: 151
            }
          ]
        },
        investorDividendDistributeds: { items: [] },
        investorDividendPaids: { items: [] },
        investorDividendPaymentFaileds: { items: [] }
      }
    })

    const balance = buildBalanceSheet(a.journal)
    expect(
      balance.equity.find((line) => line.account.family.name === 'Investor Equity')?.balance
    ).toBe(usd(2))
    expect(buildAccountingSummary(a.journal).income).toBe(0n)
    expect(a.journal).toMatchObject([
      {
        id: SAFE_DEPOSIT_TX,
        txHash: SAFE_DEPOSIT_TX,
        lines: [
          { account: { family: { name: 'Cash — Safe' } }, debit: usd(2) },
          { account: { family: { name: 'Investor Equity' } }, credit: usd(2) }
        ]
      }
    ])
    // The backed mint dropped out — no Default-D memo entry survives.
    expect(a.journal.some((entry) => entry.useCase === 'DEFAULT-D')).toBe(false)
    expect(balance.balanced).toBe(true)
  })

  it('issues an unbacked direct mint into equity (Dr SHERS To Be Issued · Cr Investor Equity)', () => {
    const a = assembleAccounting({
      ...BASE,
      // No backing deposit/withdraw → the mint is a direct share issuance.
      investorEvents: {
        investorMints: {
          items: [
            {
              id: 'm1',
              contractAddress: INVESTOR,
              shareholder: ADDR.member,
              amount: '60000000', // 60 SHER
              timestamp: 150
            }
          ]
        },
        investorDividendDistributeds: { items: [] },
        investorDividendPaids: { items: [] },
        investorDividendPaymentFaileds: { items: [] }
      }
    })

    // A real posting now (not a value-0 memo): it clears SHERS To Be Issued into
    // equity at the SHER rate of record (60 SHER × $1.00 = $60) — Dr/Cr filled.
    const issued = a.journal.find((entry) => entry.useCase === 'DEFAULT-D')
    expect(issued).toMatchObject({
      shares: 60,
      lines: [
        {
          account: { family: { name: 'SHERS To Be Issued' } },
          debit: usd(60),
          movement: { token: 'sher' }
        },
        {
          account: { family: { name: 'Investor Equity' } },
          credit: usd(60),
          movement: { token: 'sher' }
        }
      ]
    })
    // Equity increased and the trial balance still balances (Dr = Cr). No prior
    // accrual in this fixture, so the liability reads −$60 alone; in production the
    // wage accrual credits it first and the issuance nets it down.
    const balance = buildBalanceSheet(a.journal)
    expect(
      balance.equity.find((line) => line.account.family.name === 'Investor Equity')?.balance
    ).toBe(usd(60))
    expect(buildGeneralLedger(a.journal).balanced).toBe(true)
    expect(balance.balanced).toBe(true)
  })

  it('does not throw when optional feeds are null or absent', () => {
    expect(() =>
      assembleAccounting({ ...BASE, safeTransfers: null, bankEvents: null })
    ).not.toThrow()
  })
})
