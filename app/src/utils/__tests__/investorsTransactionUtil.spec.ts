import { describe, expect, it } from 'vitest'
import { zeroAddress } from 'viem'
import type { InvestorEventsQuery, SafeDepositRouterEventsQuery } from '@/types/ponder/investor'
import {
  buildRawInvestorTransactions,
  formatInvestorTransactionDate,
  getInvestorTransactionTypeColor
} from '../investorsTransactionUtil'

const INVESTOR_ADDRESS = '0x1111111111111111111111111111111111111111'
const SAFE_ROUTER_ADDRESS = '0x2222222222222222222222222222222222222222'
const SHAREHOLDER_A = '0x3333333333333333333333333333333333333333'
const SHAREHOLDER_B = '0x4444444444444444444444444444444444444444'
const SAFE_A = '0x5555555555555555555555555555555555555555'
const SAFE_B = '0x6666666666666666666666666666666666666666'
const USDC_ADDRESS = '0xa3492d046095affe351cfac15de9b86425e235db'

const buildInvestorEvents = (): InvestorEventsQuery => ({
  investorMints: {
    items: [
      {
        id: '0xminttx-0',
        contractAddress: INVESTOR_ADDRESS,
        shareholder: SHAREHOLDER_A,
        amount: '1000000',
        timestamp: 10
      }
    ]
  },
  investorDividendDistributeds: {
    items: [
      {
        id: '0xdistributedtx-0',
        contractAddress: INVESTOR_ADDRESS,
        distributor: SHAREHOLDER_A,
        token: USDC_ADDRESS,
        totalAmount: '4000000',
        shareholderCount: '2',
        timestamp: 20
      }
    ]
  },
  investorDividendPaids: {
    items: [
      {
        id: '0xpaidtx-0',
        contractAddress: INVESTOR_ADDRESS,
        shareholder: SHAREHOLDER_B,
        token: USDC_ADDRESS,
        amount: '2000000',
        timestamp: 30
      }
    ]
  },
  investorDividendPaymentFaileds: {
    items: [
      {
        id: '0xfailedtx-0',
        contractAddress: INVESTOR_ADDRESS,
        shareholder: SHAREHOLDER_B,
        token: USDC_ADDRESS,
        amount: '1000000',
        reason: 'insufficient-balance',
        timestamp: 40
      }
    ]
  }
})

const buildSafeEvents = (): SafeDepositRouterEventsQuery => ({
  safeDeposits: {
    items: [
      {
        id: '0xsafedeposit-0',
        contractAddress: SAFE_ROUTER_ADDRESS,
        depositor: SHAREHOLDER_A,
        token: USDC_ADDRESS,
        tokenAmount: '3000000',
        sherAmount: '0',
        timestamp: 50
      }
    ]
  },
  safeDepositsEnableds: {
    items: [
      {
        id: '0xenabled-0',
        contractAddress: SAFE_ROUTER_ADDRESS,
        enabledBy: SHAREHOLDER_A,
        timestamp: 60
      }
    ]
  },
  safeDepositsDisableds: {
    items: [
      {
        id: '0xdisabled-0',
        contractAddress: SAFE_ROUTER_ADDRESS,
        disabledBy: SHAREHOLDER_B,
        timestamp: 70
      }
    ]
  },
  safeAddressUpdateds: {
    items: [
      {
        id: '0xsafeupdated-0',
        contractAddress: SAFE_ROUTER_ADDRESS,
        oldSafe: SAFE_A,
        newSafe: SAFE_B,
        timestamp: 80
      }
    ]
  },
  safeMultiplierUpdateds: {
    items: [
      {
        id: '0xmultiplier-0',
        contractAddress: SAFE_ROUTER_ADDRESS,
        oldMultiplier: '1000000',
        newMultiplier: '2000000',
        timestamp: 90
      }
    ]
  }
})

describe('investorsTransactionUtil', () => {
  it('builds and sorts investor transactions from investor and safe router events', () => {
    const transactions = buildRawInvestorTransactions(buildInvestorEvents(), buildSafeEvents())
    const byType = new Map(transactions.map((row) => [row.transactionType, row]))

    expect(transactions[0]?.txHash).toBe('0xmultiplier')
    expect(transactions.map((row) => row.transactionType)).toEqual(
      expect.arrayContaining([
        'mint',
        'dividendDistributed',
        'dividendPaid',
        'dividendPaymentFailed',
        'safeDeposit',
        'safeDepositsEnabled',
        'safeDepositsDisabled',
        'safeAddressUpdated',
        'safeMultiplierUpdated'
      ])
    )
    expect(byType.get('mint')?.tokenAddress).toBe(INVESTOR_ADDRESS)
    expect(byType.get('dividendDistributed')?.tokenAddress).toBe(USDC_ADDRESS)
    expect(byType.get('dividendPaymentFailed')?.reason).toBe('insufficient-balance')
    expect(byType.get('safeDepositsEnabled')?.tokenAddress).toBe(zeroAddress)
    expect(byType.get('safeDepositsDisabled')?.tokenAddress).toBe(zeroAddress)
    expect(byType.get('safeAddressUpdated')?.tokenAddress).toBe(zeroAddress)
    expect(byType.get('safeMultiplierUpdated')?.amount).toBe('2000000')
  })

  it('returns an empty array when query data is missing', () => {
    expect(buildRawInvestorTransactions()).toEqual([])
    expect(buildRawInvestorTransactions(null, null)).toEqual([])
  })

  it('formats investor transaction dates from unix timestamps', () => {
    expect(formatInvestorTransactionDate(0)).toBe(new Date(0).toLocaleString('en-US'))
  })

  it('maps investor transaction type to badge colors', () => {
    expect(getInvestorTransactionTypeColor('mint')).toBe('success')
    expect(getInvestorTransactionTypeColor('dividendPaid')).toBe('success')
    expect(getInvestorTransactionTypeColor('dividendDistributed')).toBe('warning')
    expect(getInvestorTransactionTypeColor('dividendPaymentFailed')).toBe('error')
    expect(getInvestorTransactionTypeColor('safeTransfer')).toBe('info')
    expect(getInvestorTransactionTypeColor('safeDepositsEnabled')).toBe('neutral')
  })
})
