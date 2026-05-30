import { describe, expect, it } from 'vitest'
import {
  getTokenAddress,
  getTokenDecimals,
  isValidPositiveTokenAmount,
  resolveTokenIdByAddress
} from '../constantUtil'
import { getTransactionSummary, groupTransactionsByTxHash } from '../transactionHistoryUtil'

type TransactionFixture = {
  txHash: string
  type: string
  timestamp: number
}

describe('transactionHistoryUtil', () => {
  it('groups rows by tx hash and keeps first-seen parent order', () => {
    const grouped = groupTransactionsByTxHash<TransactionFixture>([
      { txHash: '0xaaa', type: 'deposit', timestamp: 300 },
      { txHash: '0xbbb', type: 'transfer', timestamp: 200 },
      { txHash: '0xaaa', type: 'tokenDeposit', timestamp: 290 }
    ])

    expect(grouped).toHaveLength(2)
    expect(grouped[0]?.txHash).toBe('0xaaa')
    expect(grouped[1]?.txHash).toBe('0xbbb')

    expect(grouped[0]?.groupedEventCount).toBe(2)
    expect(grouped[0]?.subRows).toHaveLength(1)
    expect(grouped[0]?.subRows[0]).toMatchObject({
      txHash: '0xaaa',
      type: 'tokenDeposit',
      groupedEventCount: 1
    })
  })

  it('returns empty subRows for a tx hash without children', () => {
    const grouped = groupTransactionsByTxHash<TransactionFixture>([
      { txHash: '0xsingle', type: 'transfer', timestamp: 100 }
    ])

    expect(grouped).toHaveLength(1)
    expect(grouped[0]?.groupedEventCount).toBe(1)
    expect(grouped[0]?.subRows).toEqual([])
  })

  it('resolves known token IDs by address (case-insensitive)', () => {
    const usdcAddress = getTokenAddress('usdc')
    expect(usdcAddress).toBeDefined()
    if (!usdcAddress) return

    expect(resolveTokenIdByAddress(usdcAddress.toUpperCase())).toBe('usdc')
  })

  it('returns null for unknown token addresses', () => {
    expect(resolveTokenIdByAddress('0x1111111111111111111111111111111111111111')).toBe(null)
  })

  it('returns token decimals from shared registry', () => {
    expect(getTokenDecimals('native')).toBe(18)
    expect(getTokenDecimals('usdc')).toBe(6)
    expect(getTokenDecimals('usdc.e')).toBe(6)
    expect(getTokenDecimals('usdt')).toBe(6)
    expect(getTokenDecimals('sher')).toBe(6)
  })

  it('validates positive token amounts using token decimals', () => {
    expect(isValidPositiveTokenAmount('1', 'native')).toBe(true)
    expect(isValidPositiveTokenAmount('0.000001', 'usdc')).toBe(true)

    expect(isValidPositiveTokenAmount('0', 'native')).toBe(false)
    expect(isValidPositiveTokenAmount('1e3', 'native')).toBe(false)
    expect(isValidPositiveTokenAmount('abc', 'native')).toBe(false)
    expect(isValidPositiveTokenAmount('0.0000001', 'usdc')).toBe(false)
  })

  it('returns summaries for value-transfer families', () => {
    expect(
      getTransactionSummary(
        { type: 'deposit', amount: '10', token: 'ETH' },
        { fromName: 'Alice', toName: 'Bob' }
      )
    ).toBe('From Alice')
    expect(getTransactionSummary({ type: 'tokenDeposit', amount: '10', token: 'USDC' })).toBe(
      'Token deposit · 10 USDC'
    )
    expect(
      getTransactionSummary({ type: 'transfer', amount: '10', token: 'ETH' }, { toName: 'Bob' })
    ).toBe('Native — to Bob')
    expect(
      getTransactionSummary(
        { type: 'tokenTransfer', amount: '10', token: 'USDC' },
        { toName: 'Bob' }
      )
    ).toBe('USDC — to Bob')
    expect(getTransactionSummary({ type: 'withdraw', amount: '10', token: 'ETH' })).toBe(
      'Withdrawal · 10 ETH'
    )
    expect(
      getTransactionSummary(
        { type: 'withdrawToken', amount: '10', token: 'USDC' },
        { toName: 'Bob' }
      )
    ).toBe('Token withdrawal to Bob')
    expect(
      getTransactionSummary(
        { type: 'ownerTreasuryWithdrawNative', amount: '10', token: 'ETH' },
        { toName: 'Bob' }
      )
    ).toBe('Treasury withdrawal to Bob')
    expect(
      getTransactionSummary(
        { type: 'ownerTreasuryWithdrawToken', amount: '10', token: 'USDC' },
        { toName: 'Bob' }
      )
    ).toBe('Treasury token withdrawal to Bob')
    expect(
      getTransactionSummary(
        { type: 'feePaid', amount: '10', token: 'USDC' },
        { toName: 'Collector' }
      )
    ).toBe('Fee to Collector')
    expect(getTransactionSummary({ type: 'mint', amount: '10', token: 'SHER' })).toBe(
      'Minted 10 SHER'
    )
    expect(getTransactionSummary({ type: 'safeDeposit', amount: '10', token: 'USDC' })).toBe(
      'Safe deposit · 10 USDC'
    )
  })

  it('returns summaries for dividend, raw-token, and status/config events', () => {
    expect(
      getTransactionSummary({ type: 'dividendDistribution', amount: '10', token: 'USDC' })
    ).toBe('Dividend triggered · 10 USDC')
    expect(
      getTransactionSummary({ type: 'dividendDistributed', amount: '10', token: 'USDC' })
    ).toBe('Distributed 10 USDC')
    expect(getTransactionSummary({ type: 'dividendPaid', amount: '10', token: 'USDC' })).toBe(
      'Paid 10 USDC'
    )
    expect(
      getTransactionSummary({ type: 'dividendPaymentFailed', amount: '10', token: 'USDC' })
    ).toBe('Payment failed · 10 USDC')
    expect(
      getTransactionSummary(
        { type: 'rawTokenIn', amount: '10', token: 'USDC' },
        { fromName: 'Treasury' }
      )
    ).toBe('From Treasury')
    expect(
      getTransactionSummary(
        { type: 'rawTokenOut', amount: '10', token: 'USDC' },
        { toName: 'Vendor' }
      )
    ).toBe('Sent to Vendor')
    expect(getTransactionSummary({ type: 'rawTokenInternal', amount: '10', token: 'USDC' })).toBe(
      'Internal · 10 USDC'
    )

    expect(getTransactionSummary({ type: 'approvalActivated', amount: '0', token: '-' })).toBe(
      'Approval activated'
    )
    expect(getTransactionSummary({ type: 'approvalDeactivated', amount: '0', token: '-' })).toBe(
      'Approval deactivated'
    )
    expect(getTransactionSummary({ type: 'wageClaimEnabled', amount: '0', token: '-' })).toBe(
      'Wage claim enabled'
    )
    expect(getTransactionSummary({ type: 'wageClaimDisabled', amount: '0', token: '-' })).toBe(
      'Wage claim disabled'
    )
    expect(getTransactionSummary({ type: 'tokenSupportAdded', amount: '0', token: '-' })).toBe(
      'Token support added'
    )
    expect(getTransactionSummary({ type: 'tokenSupportRemoved', amount: '0', token: '-' })).toBe(
      'Token support removed'
    )
    expect(getTransactionSummary({ type: 'tokenAddressChanged', amount: '0', token: '-' })).toBe(
      'Token address updated'
    )
    expect(getTransactionSummary({ type: 'safeDepositsEnabled', amount: '0', token: '-' })).toBe(
      'Safe deposits enabled'
    )
    expect(getTransactionSummary({ type: 'safeDepositsDisabled', amount: '0', token: '-' })).toBe(
      'Safe deposits disabled'
    )
    expect(getTransactionSummary({ type: 'safeAddressUpdated', amount: '0', token: '-' })).toBe(
      'Safe address updated'
    )
    expect(getTransactionSummary({ type: 'safeMultiplierUpdated', amount: '2', token: 'x' })).toBe(
      'Multiplier → 2x'
    )
    expect(getTransactionSummary({ type: 'safeMultiplierUpdated', amount: '0', token: 'x' })).toBe(
      'Multiplier → 0x'
    )
    expect(getTransactionSummary({ type: 'officerAddressUpdated', amount: '0', token: '-' })).toBe(
      'Officer address updated'
    )
  })

  it('falls back to neutral labels when value is absent and to empty for unknown types', () => {
    expect(getTransactionSummary({ type: 'deposit', amount: '0', token: '-' })).toBe('Deposit')
    expect(getTransactionSummary({ type: 'tokenDeposit', amount: '0', token: '-' })).toBe(
      'Token deposit'
    )
    expect(getTransactionSummary({ type: 'transfer', amount: '0', token: '-' })).toBe('Transfer')
    expect(getTransactionSummary({ type: 'tokenTransfer', amount: '0', token: '-' })).toBe(
      'Token transfer'
    )
    expect(getTransactionSummary({ type: 'withdraw', amount: '0', token: '-' })).toBe('Withdrawal')
    expect(getTransactionSummary({ type: 'withdrawToken', amount: '0', token: '-' })).toBe(
      'Token withdrawal'
    )
    expect(
      getTransactionSummary({ type: 'ownerTreasuryWithdrawNative', amount: '0', token: '-' })
    ).toBe('Treasury withdrawal')
    expect(
      getTransactionSummary({ type: 'ownerTreasuryWithdrawToken', amount: '0', token: '-' })
    ).toBe('Treasury token withdrawal')
    expect(getTransactionSummary({ type: 'feePaid', amount: '0', token: '-' })).toBe('Fee paid')
    expect(getTransactionSummary({ type: 'mint', amount: '0', token: '-' })).toBe('Shares minted')
    expect(getTransactionSummary({ type: 'safeDeposit', amount: '0', token: '-' })).toBe(
      'Safe deposit'
    )
    expect(getTransactionSummary({ type: 'dividendDistribution', amount: '0', token: '-' })).toBe(
      'Dividend triggered'
    )
    expect(getTransactionSummary({ type: 'dividendDistributed', amount: '0', token: '-' })).toBe(
      'Dividend distributed'
    )
    expect(getTransactionSummary({ type: 'dividendPaid', amount: '0', token: '-' })).toBe(
      'Dividend paid'
    )
    expect(getTransactionSummary({ type: 'dividendPaymentFailed', amount: '0', token: '-' })).toBe(
      'Payment failed'
    )
    expect(getTransactionSummary({ type: 'rawTokenIn', amount: '0', token: '-' })).toBe(
      'Token received'
    )
    expect(getTransactionSummary({ type: 'rawTokenOut', amount: '0', token: '-' })).toBe(
      'Token sent'
    )
    expect(getTransactionSummary({ type: 'rawTokenInternal', amount: '0', token: '-' })).toBe(
      'Internal transfer'
    )
    expect(getTransactionSummary({ type: 'safeMultiplierUpdated', amount: '', token: 'x' })).toBe(
      'Multiplier updated'
    )
    expect(getTransactionSummary({ type: 'unknownType', amount: '1', token: 'USDC' })).toBe('')
  })
})
