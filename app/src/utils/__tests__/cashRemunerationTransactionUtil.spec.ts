import { describe, expect, it } from 'vitest'
import { zeroAddress } from 'viem'
import type { IncomingBankTokenTransfersQuery } from '@/types/ponder/bank'
import type { CashRemunerationEventsQuery } from '@/types/ponder/cash-remuneration'
import {
  buildRawCashRemunerationTransactions,
  formatCashRemunerationTransactionDate,
  getCashRemunerationTransactionTypeColor
} from '../cashRemunerationTransactionUtil'

const CONTRACT_ADDRESS = '0x1111111111111111111111111111111111111111'
const USER_A = '0x2222222222222222222222222222222222222222'
const USER_B = '0x3333333333333333333333333333333333333333'
const TOKEN_ADDRESS = '0xa3492d046095affe351cfac15de9b86425e235db'
const SIGNATURE_HASH = '0xabc123'

const buildCashRemunerationEvents = (): CashRemunerationEventsQuery => ({
  cashRemunerationDeposits: {
    items: [
      {
        id: '0xdeposithash-0',
        contractAddress: CONTRACT_ADDRESS,
        depositor: USER_A,
        amount: '1000000000000000000',
        timestamp: 10
      }
    ]
  },
  cashRemunerationWithdraws: {
    items: [
      {
        id: '0xwithdrawhash-0',
        contractAddress: CONTRACT_ADDRESS,
        withdrawer: USER_A,
        amount: '2000000000000000000',
        timestamp: 20
      }
    ]
  },
  cashRemunerationWithdrawTokens: {
    items: [
      {
        id: '0xwithdrawtokenhash-0',
        contractAddress: CONTRACT_ADDRESS,
        withdrawer: USER_B,
        tokenAddress: TOKEN_ADDRESS,
        amount: '3000000',
        timestamp: 30
      }
    ]
  },
  cashRemunerationWageClaims: {
    items: [
      {
        id: '0xwageclaimenabledhash-0',
        contractAddress: CONTRACT_ADDRESS,
        signatureHash: SIGNATURE_HASH,
        enabled: true,
        timestamp: 40
      },
      {
        id: '0xwageclaimdisabledhash-0',
        contractAddress: CONTRACT_ADDRESS,
        signatureHash: SIGNATURE_HASH,
        enabled: false,
        timestamp: 41
      }
    ]
  },
  cashRemunerationOwnerTreasuryWithdrawNatives: {
    items: [
      {
        id: '0xownernativehash-0',
        contractAddress: CONTRACT_ADDRESS,
        ownerAddress: USER_B,
        amount: '4000000000000000000',
        timestamp: 50
      }
    ]
  },
  cashRemunerationOwnerTreasuryWithdrawTokens: {
    items: [
      {
        id: '0xownertokenhash-0',
        contractAddress: CONTRACT_ADDRESS,
        ownerAddress: USER_B,
        tokenAddress: TOKEN_ADDRESS,
        amount: '5000000',
        timestamp: 60
      }
    ]
  },
  cashRemunerationOfficerUpdateds: {
    items: [
      {
        id: '0xofficerhash-0',
        contractAddress: CONTRACT_ADDRESS,
        newOfficerAddress: USER_A,
        timestamp: 70
      }
    ]
  },
  cashRemunerationTokenSupportAddeds: {
    items: [
      {
        id: '0xtokensupportaddedhash-0',
        contractAddress: CONTRACT_ADDRESS,
        tokenAddress: TOKEN_ADDRESS,
        timestamp: 80
      }
    ]
  },
  cashRemunerationTokenSupportRemoveds: {
    items: [
      {
        id: '0xtokensupportremovedhash-0',
        contractAddress: CONTRACT_ADDRESS,
        tokenAddress: TOKEN_ADDRESS,
        timestamp: 90
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
        to: CONTRACT_ADDRESS,
        token: TOKEN_ADDRESS,
        amount: '7000000',
        timestamp: 25
      }
    ]
  }
})

describe('cashRemunerationTransactionUtil', () => {
  it('builds and sorts cash remuneration transactions from all event sections', () => {
    const transactions = buildRawCashRemunerationTransactions(
      buildCashRemunerationEvents(),
      buildIncomingTokenTransfers()
    )
    const byType = new Map(transactions.map((row) => [row.type, row]))
    const tokenDeposits = transactions.filter((row) => row.type === 'tokenDeposit')

    expect(transactions[0]?.txHash).toBe('0xtokensupportremovedhash')
    expect(transactions.map((row) => row.type)).toEqual(
      expect.arrayContaining([
        'deposit',
        'tokenDeposit',
        'withdraw',
        'withdrawToken',
        'wageClaimEnabled',
        'wageClaimDisabled',
        'ownerTreasuryWithdrawNative',
        'ownerTreasuryWithdrawToken',
        'officerAddressUpdated',
        'tokenSupportAdded',
        'tokenSupportRemoved'
      ])
    )
    expect(byType.get('deposit')?.tokenAddress).toBe(zeroAddress)
    expect(tokenDeposits).toHaveLength(1)
    expect(tokenDeposits[0]).toMatchObject({
      from: '0x9999999999999999999999999999999999999999',
      to: CONTRACT_ADDRESS,
      amount: '7000000',
      tokenAddress: TOKEN_ADDRESS
    })
    expect(byType.get('withdrawToken')?.tokenAddress).toBe(TOKEN_ADDRESS)
    expect(byType.get('wageClaimEnabled')).toMatchObject({
      to: SIGNATURE_HASH,
      amount: '0',
      tokenAddress: zeroAddress
    })
  })

  it('returns an empty array when query data is undefined', () => {
    expect(buildRawCashRemunerationTransactions()).toEqual([])
    expect(buildRawCashRemunerationTransactions(null)).toEqual([])
  })

  it('maps incoming token transfers into tokenDeposit rows', () => {
    const rows = buildRawCashRemunerationTransactions(undefined, buildIncomingTokenTransfers())
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      type: 'tokenDeposit',
      from: '0x9999999999999999999999999999999999999999',
      to: CONTRACT_ADDRESS,
      tokenAddress: TOKEN_ADDRESS
    })
  })

  it('formats cash remuneration transaction dates from unix timestamps', () => {
    expect(formatCashRemunerationTransactionDate(0)).toBe(new Date(0).toLocaleString('en-US'))
  })

  it('maps cash remuneration transaction type to badge colors', () => {
    expect(getCashRemunerationTransactionTypeColor('deposit')).toBe('success')
    expect(getCashRemunerationTransactionTypeColor('withdrawToken')).toBe('warning')
    expect(getCashRemunerationTransactionTypeColor('wageClaimEnabled')).toBe('info')
    expect(getCashRemunerationTransactionTypeColor('tokenSupportAdded')).toBe('primary')
    expect(getCashRemunerationTransactionTypeColor('unknown')).toBe('neutral')
  })
})
