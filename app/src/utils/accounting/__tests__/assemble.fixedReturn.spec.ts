/**
 * End-to-end assembly of a Community Credit (FixedReturn) round — the feed goes
 * in raw and the ledger, income statement and balance sheet come out. The
 * per-event mapping is covered in `fixedReturn.spec.ts`; what matters here is
 * that the round reaches the statements and the books still balance.
 */
import { describe, it, expect } from 'vitest'
import type { Address } from 'viem'
import type { TeamContract, ContractType } from '@/types/teamContract'
import { assembleCncAccounting, type CncAccountingInput } from '@/utils/accounting/assemble'
import type { UsdRateOfRecord } from '@/utils/accounting/toUsd'
import { USDC_ADDRESS } from '@/constant'
import { ADDR } from './fixtures'

const FIXED_RETURN = ADDR.credit as Address
const DEPLOYER = ADDR.founder as Address

const CONTRACTS: TeamContract[] = (
  [
    ['Bank', ADDR.bank],
    ['Safe', ADDR.safe],
    ['FixedReturn', FIXED_RETURN]
  ] as [ContractType, string][]
).map(([type, address]) => ({ type, address: address as Address, deployer: DEPLOYER, admins: [] }))

/** Stub rate of record: native $2 (USDC is pegged $1 by toUsd). */
const RATE: UsdRateOfRecord = (tokenId) => (tokenId === 'native' ? 2 : 1)

const BASE: CncAccountingInput = {
  contracts: CONTRACTS,
  safeAddress: ADDR.safe,
  feeCollectorAddress: ADDR.feeCollector,
  rateOfRecord: RATE
}

describe('assembleCncAccounting — Community Credit', () => {
  it('runs a Community Credit round through to the statements', () => {
    const emptyFixedReturn = {
      fixedReturnLendingOfferRefundables: { items: [] },
      fixedReturnPartialFundingAccepteds: { items: [] },
      fixedReturnPrincipalRefundeds: { items: [] },
      fixedReturnRefundsDistributeds: { items: [] },
      fixedReturnRepaymentDistributeds: { items: [] },
      fixedReturnOwnershipTransferreds: { items: [] },
      fixedReturnTokenSupportAddeds: { items: [] },
      fixedReturnTokenSupportRemoveds: { items: [] }
    }
    const a = assembleCncAccounting({
      ...BASE,
      fixedReturnEvents: {
        ...emptyFixedReturn,
        fixedReturnLendingOfferCreateds: {
          items: [
            {
              id: 'fc1',
              contractAddress: FIXED_RETURN,
              offerId: '1',
              token: USDC_ADDRESS,
              fundingTarget: '100000000', // 100 USDC
              timestamp: 100
            }
          ]
        },
        fixedReturnFundsLents: {
          items: [
            {
              id: 'fl1',
              contractAddress: FIXED_RETURN,
              offerId: '1',
              lender: ADDR.lender,
              amount: '100000000',
              timestamp: 110
            }
          ]
        },
        fixedReturnLendingOfferFundeds: {
          items: [{ id: 'fd1', contractAddress: FIXED_RETURN, offerId: '1', timestamp: 110 }]
        },
        // Repaid in full: 100 principal + 5 fixed return.
        fixedReturnLenderRepaids: {
          items: [
            {
              id: 'rp1',
              contractAddress: FIXED_RETURN,
              offerId: '1',
              lender: ADDR.lender,
              amount: '105000000',
              timestamp: 200
            }
          ]
        }
      }
    })

    // The borrowed cash reached Bank, then left again with the interest on top.
    expect(a.summary.cash).toBe(-5)
    // Principal in and out nets the liability to zero; only the return is a cost.
    expect(a.balanceSheet.liabilities).toEqual([])
    expect(a.incomeStatement.expenses).toContainEqual({ account: 'Interest Expense', amount: 5 })
    expect(a.incomeStatement.netIncome).toBe(-5)
    expect(a.generalLedger.balanced).toBe(true)
    expect(a.balanceSheet.balanced).toBe(true)
  })
})
