import { describe, expect, it } from 'vitest'
import { zeroAddress } from 'viem'
import type { IncomingBankTokenTransfersQuery } from '@/types/ponder/bank'
import type { ExpenseEventsQuery } from '@/types/ponder/expense'
import {
  buildRawExpenseTransactions,
  formatExpenseTransactionDate,
  getExpenseTransactionTypeColor
} from '../expenseTransactionUtil'

const EXPENSE_ADDRESS = '0x1111111111111111111111111111111111111111'
const USER_A = '0x2222222222222222222222222222222222222222'
const USER_B = '0x3333333333333333333333333333333333333333'
const USDC_ADDRESS = '0xa3492d046095affe351cfac15de9b86425e235db'
const SIGNATURE_HASH = '0xabc123'

const buildExpenseEvents = (): ExpenseEventsQuery => ({
  expenseDeposits: {
    items: [
      {
        id: '0xdeposithash-0',
        contractAddress: EXPENSE_ADDRESS,
        depositor: USER_A,
        amount: '1000000000000000000',
        timestamp: 10
      }
    ]
  },
  expenseTokenDeposits: {
    items: [
      {
        id: '0xtokendeposithash-0',
        contractAddress: EXPENSE_ADDRESS,
        depositor: USER_A,
        token: USDC_ADDRESS,
        amount: '3000000',
        timestamp: 20
      }
    ]
  },
  expenseTransfers: {
    items: [
      {
        id: '0xtransferhash-0',
        contractAddress: EXPENSE_ADDRESS,
        withdrawer: USER_A,
        to: USER_B,
        amount: '500000',
        timestamp: 30
      }
    ]
  },
  expenseTokenTransfers: {
    items: [
      {
        id: '0xtokentransferhash-0',
        contractAddress: EXPENSE_ADDRESS,
        withdrawer: USER_B,
        to: USER_A,
        token: USDC_ADDRESS,
        amount: '7000000',
        timestamp: 40
      }
    ]
  },
  expenseApprovals: {
    items: [
      {
        id: '0xapprovalactivatedhash-0',
        contractAddress: EXPENSE_ADDRESS,
        signatureHash: SIGNATURE_HASH,
        activated: true,
        timestamp: 50
      },
      {
        id: '0xapprovaldeactivatedhash-0',
        contractAddress: EXPENSE_ADDRESS,
        signatureHash: SIGNATURE_HASH,
        activated: false,
        timestamp: 51
      }
    ]
  },
  expenseOwnerTreasuryWithdrawNatives: {
    items: [
      {
        id: '0xownernativehash-0',
        contractAddress: EXPENSE_ADDRESS,
        ownerAddress: USER_B,
        amount: '900000',
        timestamp: 60
      }
    ]
  },
  expenseOwnerTreasuryWithdrawTokens: {
    items: [
      {
        id: '0xownertokenhash-0',
        contractAddress: EXPENSE_ADDRESS,
        ownerAddress: USER_B,
        token: USDC_ADDRESS,
        amount: '1100000',
        timestamp: 70
      }
    ]
  },
  expenseTokenSupportAddeds: {
    items: [
      {
        id: '0xtokensupportaddedhash-0',
        contractAddress: EXPENSE_ADDRESS,
        tokenAddress: USDC_ADDRESS,
        timestamp: 80
      }
    ]
  },
  expenseTokenSupportRemoveds: {
    items: [
      {
        id: '0xtokensupportremovedhash-0',
        contractAddress: EXPENSE_ADDRESS,
        tokenAddress: USDC_ADDRESS,
        timestamp: 90
      }
    ]
  },
  expenseTokenAddressChangeds: {
    items: [
      {
        id: '0xtokenaddresschangedhash-0',
        contractAddress: EXPENSE_ADDRESS,
        addressWhoChanged: USER_A,
        tokenSymbol: 'USDC',
        oldAddress: USER_A,
        newAddress: USER_B,
        timestamp: 100
      }
    ]
  }
})

const buildIncomingTokenTransfers = (): IncomingBankTokenTransfersQuery => ({
  bankTokenTransfers: {
    items: [
      {
        id: '0xbankfundinghash-0',
        contractAddress: '0x9999999999999999999999999999999999999999',
        sender: USER_A,
        to: EXPENSE_ADDRESS,
        token: USDC_ADDRESS,
        amount: '2000000',
        timestamp: 25
      }
    ]
  }
})

describe('expenseTransactionUtil', () => {
  it('builds and sorts expense transactions from all event sections', () => {
    const transactions = buildRawExpenseTransactions(
      buildExpenseEvents(),
      buildIncomingTokenTransfers()
    )
    const byType = new Map(transactions.map((row) => [row.type, row]))
    const tokenDeposits = transactions.filter((row) => row.type === 'tokenDeposit')

    expect(transactions[0]?.txHash).toBe('0xtokenaddresschangedhash')
    expect(transactions.map((row) => row.type)).toEqual(
      expect.arrayContaining([
        'deposit',
        'tokenDeposit',
        'transfer',
        'tokenTransfer',
        'approvalActivated',
        'approvalDeactivated',
        'ownerTreasuryWithdrawNative',
        'ownerTreasuryWithdrawToken',
        'tokenSupportAdded',
        'tokenSupportRemoved',
        'tokenAddressChanged'
      ])
    )

    expect(byType.get('deposit')?.tokenAddress).toBe(zeroAddress)
    expect(tokenDeposits).toHaveLength(2)
    expect(
      tokenDeposits.some(
        (row) =>
          row.from === '0x9999999999999999999999999999999999999999' &&
          row.to === EXPENSE_ADDRESS &&
          row.amount === '2000000' &&
          row.tokenAddress === USDC_ADDRESS
      )
    ).toBe(true)
    expect(
      tokenDeposits.some(
        (row) => row.from === USER_A && row.to === EXPENSE_ADDRESS && row.amount === '3000000'
      )
    ).toBe(true)
    expect(byType.get('tokenDeposit')?.tokenAddress).toBe(USDC_ADDRESS)
    expect(byType.get('tokenTransfer')?.tokenAddress).toBe(USDC_ADDRESS)
    expect(byType.get('approvalActivated')).toMatchObject({
      from: EXPENSE_ADDRESS,
      to: SIGNATURE_HASH,
      amount: '0'
    })
  })

  it('maps incoming token transfers into tokenDeposit rows', () => {
    const rows = buildRawExpenseTransactions(undefined, buildIncomingTokenTransfers())
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      from: '0x9999999999999999999999999999999999999999',
      to: EXPENSE_ADDRESS,
      amount: '2000000',
      tokenAddress: USDC_ADDRESS,
      type: 'tokenDeposit'
    })
  })

  it('returns an empty array when query data is undefined', () => {
    expect(buildRawExpenseTransactions()).toEqual([])
    expect(buildRawExpenseTransactions(null)).toEqual([])
  })

  it('formats expense transaction dates from unix timestamps', () => {
    expect(formatExpenseTransactionDate(0)).toBe(new Date(0).toLocaleString('en-US'))
  })

  it('maps transaction type to badge colors', () => {
    expect(getExpenseTransactionTypeColor('tokenDeposit')).toBe('success')
    expect(getExpenseTransactionTypeColor('tokenTransfer')).toBe('info')
    expect(getExpenseTransactionTypeColor('ownerTreasuryWithdrawNative')).toBe('info')
    expect(getExpenseTransactionTypeColor('approvalActivated')).toBe('warning')
    expect(getExpenseTransactionTypeColor('tokenSupportAdded')).toBe('primary')
    expect(getExpenseTransactionTypeColor('unknown')).toBe('neutral')
  })
})
