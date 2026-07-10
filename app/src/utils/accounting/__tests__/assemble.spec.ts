import { describe, it, expect } from 'vitest'
import type { Address } from 'viem'
import type { TeamContract, ContractType } from '@/types/teamContract'
import {
  assembleCncAccounting,
  emptyCncAccounting,
  phase1RateOfRecord,
  type CncAccountingInput
} from '@/utils/accounting/assemble'
import type { UsdRateOfRecord } from '@/utils/accounting/toUsd'
import { USDC_ADDRESS } from '@/constant'
import { ADDR } from './fixtures'

const ROUTER = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
const INVESTOR = '0xcccccccccccccccccccccccccccccccccccccccc'
const DEPLOYER = ADDR.founder as Address

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

/** Common context for the assembled team (USDC token + fee collector + founder). */
const BASE: CncAccountingInput = {
  contracts: CONTRACTS,
  safeAddress: ADDR.safe,
  founderAddresses: [ADDR.founder],
  feeCollectorAddress: ADDR.feeCollector,
  sherTokenAddress: ADDR.sherToken,
  safeDepositRouterAddress: ROUTER,
  rateOfRecord: RATE
}

describe('assembleCncAccounting', () => {
  it('returns an empty, balanced result for no feeds', () => {
    const a = emptyCncAccounting()
    expect(a.entries).toEqual([])
    expect(a.summary).toMatchObject({ cash: 0, income: 0, expense: 0, equity: 0 })
    expect(a.generalLedger.balanced).toBe(true)
    expect(a.balanceSheet.balanced).toBe(true)
    expect(a.incomeStatement.netIncome).toBe(0)
  })

  it('books a client USDC deposit into Bank as Service Revenue', () => {
    const a = assembleCncAccounting({
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
        bankFeePaids: {
          items: [
            {
              id: 'f1',
              contractAddress: ADDR.bank,
              feeCollector: ADDR.feeCollector,
              token: USDC_ADDRESS,
              amount: '1000000', // 1 USDC fee
              timestamp: 120
            }
          ]
        },
        bankOwnershipTransferreds: { items: [] },
        rawContractTokenTransfers: { items: [] }
      }
    })

    expect(a.summary.income).toBe(100)
    expect(a.incomeStatement.revenue).toContainEqual({ account: 'Service Revenue', amount: 100 })
    // The protocol fee is booked as a Transaction Fee Expense leaving the Bank.
    const fee = a.entries.find((e) => e.useCase === 'FEE')
    expect(fee).toMatchObject({
      debit: 'Transaction Fee Expense',
      credit: 'Cash — Bank',
      internal: false
    })
    expect(a.summary.expense).toBe(1)
    expect(a.incomeStatement.expenses).toContainEqual({
      account: 'Transaction Fee Expense',
      amount: 1
    })
    expect(a.generalLedger.balanced).toBe(true)
    expect(a.balanceSheet.balanced).toBe(true)
  })

  it('collapses the cross-contract internal-transfer twin (Bank → Payroll)', () => {
    const a = assembleCncAccounting({
      ...BASE,
      // Same native move indexed twice: Bank `Transfer` out and CashRem `Deposited`.
      bankEvents: {
        bankDeposits: { items: [] },
        bankTokenDeposits: { items: [] },
        bankTransfers: {
          items: [
            {
              id: 'bt1',
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
              id: 'cd1',
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

    const internal = a.entries.filter(
      (e) => e.internal && e.debit === 'Cash — Payroll' && e.credit === 'Cash — Bank'
    )
    expect(internal).toHaveLength(1) // the twin was deduped
    expect(a.generalLedger.balanced).toBe(true)
  })

  it('enriches a wage settlement with its off-chain Payroll category', () => {
    const a = assembleCncAccounting({
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

    const payroll = a.entries.find((e) => e.useCase === 'UC-CASH-03')
    expect(payroll?.enrichment).toBe('enriched')
    expect(payroll?.category).toBe('Payroll')
    expect(payroll?.memo).toContain('sprint work')
  })

  it('books an investment via the SafeDepositRouter as Investor Equity', () => {
    const a = assembleCncAccounting({
      ...BASE,
      safeDepositRouterEvents: {
        safeDeposits: {
          items: [
            {
              id: 's1',
              contractAddress: ROUTER,
              depositor: ADDR.client,
              token: USDC_ADDRESS,
              tokenAmount: '200000000', // 200 USDC
              sherAmount: '400000000',
              timestamp: 150
            }
          ]
        },
        safeDepositsEnableds: { items: [] },
        safeDepositsDisableds: { items: [] },
        safeAddressUpdateds: { items: [] },
        safeMultiplierUpdateds: { items: [] }
      },
      // The matching mint must NOT be double-booked as equity.
      investorEvents: {
        investorMints: {
          items: [
            {
              id: 'm1',
              contractAddress: INVESTOR,
              shareholder: ADDR.client,
              amount: '400000000',
              timestamp: 151
            }
          ]
        },
        investorDividendDistributeds: { items: [] },
        investorDividendPaids: { items: [] },
        investorDividendPaymentFaileds: { items: [] }
      }
    })

    expect(a.balanceSheet.investorEquity).toBe(200)
    // The backed mint dropped out — no Default-D memo entry survives.
    expect(a.entries.some((e) => e.useCase === 'DEFAULT-D')).toBe(false)
    expect(a.balanceSheet.balanced).toBe(true)
  })

  it('honours an injected rate of record and defaults native/SHER to zero', () => {
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

    const withRate = assembleCncAccounting({ ...BASE, bankEvents })
    expect(withRate.summary.income).toBe(2) // 1 native @ $2

    const phase1 = assembleCncAccounting({ ...BASE, rateOfRecord: phase1RateOfRecord, bankEvents })
    expect(phase1.summary.income).toBe(0) // native priced at $0 until the FX gap is filled
  })

  it('does not throw when optional feeds are null or absent', () => {
    expect(() =>
      assembleCncAccounting({ ...BASE, safeTransfers: null, bankEvents: null })
    ).not.toThrow()
  })
})
