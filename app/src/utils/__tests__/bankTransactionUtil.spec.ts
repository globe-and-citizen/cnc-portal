import { describe, expect, it } from 'vitest'
import { zeroAddress } from 'viem'
import type { BankEventsQuery } from '@/types/ponder/bank'
import {
  buildRawBankTransactions,
  formatBankTransactionDate,
  getBankTransactionTypeColor
} from '../bankTransactionUtil'

const BANK_ADDRESS = '0x1111111111111111111111111111111111111111'
const USER_A = '0x2222222222222222222222222222222222222222'
const USER_B = '0x3333333333333333333333333333333333333333'
const USDC_ADDRESS = '0xa3492d046095affe351cfac15de9b86425e235db'
const USDT_ADDRESS = '0xc5fA85B5C5f9C3A17f5A24b2B55B4516C3A4fA5B'

const buildBankEvents = (): BankEventsQuery => ({
  bankDeposits: {
    items: [
      {
        id: '0xdeposithash-0',
        contractAddress: BANK_ADDRESS,
        depositor: USER_A,
        amount: '1000000000000000000',
        timestamp: 10
      }
    ]
  },
  bankTokenDeposits: {
    items: [
      {
        id: '0xtokendeposithash-0',
        contractAddress: BANK_ADDRESS,
        depositor: USER_A,
        token: USDC_ADDRESS,
        amount: '3000000',
        timestamp: 20
      }
    ]
  },
  bankTransfers: {
    items: [
      {
        id: '0xtransferhash-0',
        sender: USER_A,
        to: USER_B,
        amount: '500000',
        timestamp: 30
      }
    ]
  },
  bankTokenTransfers: {
    items: [
      {
        id: '0xtokentransferhash-0',
        sender: USER_B,
        to: USER_A,
        token: USDT_ADDRESS,
        amount: '7000000',
        timestamp: 40
      }
    ]
  },
  bankDividendDistributionTriggereds: {
    items: [
      {
        id: '0xdividendhash-0',
        contractAddress: BANK_ADDRESS,
        investor: USER_A,
        token: USDC_ADDRESS,
        totalAmount: '9000000',
        timestamp: 50
      }
    ]
  },
  bankFeePaids: {
    items: [
      {
        id: '0xfeehash1-0',
        contractAddress: BANK_ADDRESS,
        feeCollector: USER_B,
        token: USDC_ADDRESS,
        amount: '100000',
        timestamp: 60
      },
      {
        id: '0xfeehash2-0',
        contractAddress: BANK_ADDRESS,
        feeCollector: USER_A,
        token: null,
        amount: '200000',
        timestamp: 61
      }
    ]
  },
  bankOwnershipTransferreds: {
    items: []
  },
  rawContractTokenTransfers: {
    items: [
      {
        id: '0xrawin-0',
        tokenAddress: USDC_ADDRESS,
        contractAddress: BANK_ADDRESS,
        direction: 'in',
        from: USER_A,
        to: BANK_ADDRESS,
        amount: '1',
        timestamp: 70
      },
      {
        id: '0xrawout-0',
        tokenAddress: USDC_ADDRESS,
        contractAddress: BANK_ADDRESS,
        direction: 'out',
        from: BANK_ADDRESS,
        to: USER_B,
        amount: '2',
        timestamp: 71
      },
      {
        id: '0xrawinternal-0',
        tokenAddress: USDC_ADDRESS,
        contractAddress: BANK_ADDRESS,
        direction: 'internal',
        from: USER_A,
        to: USER_B,
        amount: '3',
        timestamp: 72
      }
    ]
  }
})

describe('bankTransactionUtil', () => {
  it('builds and sorts bank transactions from all event sections', () => {
    const transactions = buildRawBankTransactions(buildBankEvents())
    const byType = new Map(transactions.map((row) => [row.type, row]))

    expect(transactions[0]?.txHash).toBe('0xrawinternal')
    expect(transactions.map((row) => row.type)).toEqual(
      expect.arrayContaining([
        'deposit',
        'tokenDeposit',
        'transfer',
        'tokenTransfer',
        'dividendDistribution',
        'feePaid',
        'rawTokenIn',
        'rawTokenOut',
        'rawTokenInternal'
      ])
    )
    expect(byType.get('deposit')?.tokenAddress).toBe(zeroAddress)
    expect(byType.get('tokenDeposit')?.tokenAddress).toBe(USDC_ADDRESS)
    expect(byType.get('tokenTransfer')?.tokenAddress).toBe(USDT_ADDRESS)
    expect(byType.get('dividendDistribution')?.to).toBe(USER_A)
    expect(
      transactions.filter((row) => row.type === 'feePaid').map((row) => row.tokenAddress)
    ).toEqual(expect.arrayContaining([USDC_ADDRESS, zeroAddress]))
  })

  it('returns an empty array when query data is undefined', () => {
    expect(buildRawBankTransactions()).toEqual([])
    expect(buildRawBankTransactions(null)).toEqual([])
  })

  it('formats bank transaction dates from unix timestamps', () => {
    expect(formatBankTransactionDate(0)).toBe(new Date(0).toLocaleString('en-US'))
  })

  it('maps transaction type to badge colors', () => {
    expect(getBankTransactionTypeColor('TokenDeposit')).toBe('success')
    expect(getBankTransactionTypeColor('tokenTransfer')).toBe('info')
    expect(getBankTransactionTypeColor('rawTokenOut')).toBe('info')
    expect(getBankTransactionTypeColor('dividendDistribution')).toBe('warning')
    expect(getBankTransactionTypeColor('feePaid')).toBe('error')
    expect(getBankTransactionTypeColor('ownerChanged')).toBe('neutral')
  })
})
