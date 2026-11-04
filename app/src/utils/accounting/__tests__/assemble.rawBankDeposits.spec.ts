import { describe, expect, it } from 'vitest'
import type { Address } from 'viem'
import { USDC_ADDRESS } from '@/constant'
import type { ContractType, TeamContract } from '@/types/teamContract'
import type { CncAccountingInput } from '@/utils/accounting/assemble'
import { buildBalanceSheet } from '@/utils/accounting/balanceSheet'
import { buildIncomeStatement } from '@/utils/accounting/incomeStatement'
import { ADDR, usd } from './fixtures'
import { assembleAccounting } from './assembleAccounting'

const FUNDING_TX = `0x${'a'.repeat(64)}`
const PAYOUT_TX = `0x${'b'.repeat(64)}`
const SWEEP_TX = `0x${'c'.repeat(64)}`
const CLIENT_DEPOSIT_TX = `0x${'d'.repeat(64)}`

const CONTRACTS: TeamContract[] = (
  [
    ['Bank', ADDR.bank],
    ['CashRemunerationEIP712', ADDR.payroll],
    ['FixedReturn', ADDR.credit]
  ] as [ContractType, string][]
).map(([type, address]) => ({
  type,
  address: address as Address,
  deployer: ADDR.founder as Address,
  admins: []
}))

function rawTransfer(id: string, from: string, to: string, amount: string) {
  return {
    id,
    tokenAddress: USDC_ADDRESS,
    contractAddress: ADDR.bank,
    direction: to === ADDR.bank ? 'in' : 'out',
    from,
    to,
    amount,
    timestamp: 100
  }
}

/**
 * A first-generation Bank funded by a plain USDC transfer from the founder, then
 * paying the payroll: 200.05 in, 199.04975 out plus a 1.00025 fee. A client's
 * 10 USDC deposit through the Bank also carries its raw ERC-20 copy.
 */
const INPUT: CncAccountingInput = {
  contracts: CONTRACTS,
  rateOfRecord: () => 1,
  bankEvents: {
    bankDeposits: { items: [] },
    bankTokenDeposits: {
      items: [
        {
          id: `${CLIENT_DEPOSIT_TX}-1`,
          contractAddress: ADDR.bank,
          depositor: ADDR.client,
          token: USDC_ADDRESS,
          amount: '10000000',
          timestamp: 150
        }
      ]
    },
    bankTransfers: { items: [] },
    bankTokenTransfers: {
      items: [
        {
          id: `${PAYOUT_TX}-2`,
          contractAddress: ADDR.bank,
          sender: ADDR.founder,
          to: ADDR.payroll,
          token: USDC_ADDRESS,
          amount: '199049750',
          timestamp: 200
        }
      ]
    },
    bankDividendDistributionTriggereds: { items: [] },
    bankFeePaids: {
      items: [
        {
          id: `${PAYOUT_TX}-1`,
          contractAddress: ADDR.bank,
          feeCollector: ADDR.feeCollector,
          token: USDC_ADDRESS,
          amount: '1000250',
          timestamp: 200
        }
      ]
    },
    bankOwnershipTransferreds: { items: [] },
    bankTokenSupportAddeds: { items: [] },
    bankTokenSupportRemoveds: { items: [] },
    rawContractTokenTransfers: {
      items: [
        rawTransfer(`${FUNDING_TX}-0`, ADDR.founder, ADDR.bank, '200050000'),
        rawTransfer(`${CLIENT_DEPOSIT_TX}-0`, ADDR.client, ADDR.bank, '10000000'),
        rawTransfer(`${PAYOUT_TX}-3`, ADDR.bank, ADDR.payroll, '199049750'),
        rawTransfer(`${SWEEP_TX}-0`, ADDR.credit, ADDR.bank, '5000000')
      ]
    }
  }
}

describe('a Bank funded by plain token transfers', () => {
  it('[AC-US-ACCT-005-15] books the founder’s plain transfer as a deposit, so the Bank never runs negative', () => {
    const { journal } = assembleAccounting(INPUT)
    const balance = buildBalanceSheet(journal)

    const bank = balance.assets.find((line) => line.account.family.name === 'Cash — Bank')
    expect(bank?.balance).toBe(usd(10))
    expect(balance.balanced).toBe(true)
  })

  it('counts each deposit once and leaves a CNC contract’s transfer to its own source', () => {
    const { journal } = assembleAccounting(INPUT)
    const income = buildIncomeStatement(journal)

    expect(income.revenue).toEqual([{ account: 'Service Revenue', amount: usd(210.05) }])
  })
})
