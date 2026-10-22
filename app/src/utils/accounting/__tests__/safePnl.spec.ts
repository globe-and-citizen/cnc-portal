import { describe, expect, it } from 'vitest'
import { parseUnits } from 'viem'
import { assetId } from '@/utils/tokens/assets'
import type { SafeClientBalances, SafeIncomingTransfer } from '@/types/safe'
import { safeTreasuryPnl } from '../safePnl'
import { finalizeJournalEntryDrafts } from '../journalEntry'
import { drafts, history, TOKEN, transfer, ROUTER, tx } from './safeExchangeFixtures'
import { swapFeeInput, SWAP_AMOUNT, SWAP_QUANTITY } from './swapFeeFixtures'
import { usd, ADDR } from './fixtures'
import { USDC_ADDRESS } from '@/constant'
import { applyHistoricalRates } from '../toUsd'

function balances(quantity: string, value: string): SafeClientBalances {
  return {
    fiatTotal: value,
    items: [
      {
        tokenInfo: {
          type: 'ERC20',
          address: TOKEN,
          name: 'Wrapped Ether',
          symbol: 'AWETH',
          decimals: 18,
          logoUri: null
        },
        balance: parseUnits(quantity, 18).toString(),
        fiatConversion: '2440',
        fiatBalance: value
      }
    ]
  }
}

describe('Safe treasury P&L from canonical postings', () => {
  it('keeps the actual swap cost fixed and attributes market changes to the acquired asset', () => {
    const rows = history().slice(0, 3)
    rows[0]!.value = '532944250'
    rows[1]!.value = '532944250'
    rows[2]!.value = '194336006018297504'
    const journal = finalizeJournalEntryDrafts(drafts(rows, 2726.952839)).journal
    const result = safeTreasuryPnl(journal, balances('0.194336006018297504', '474.13'), true)
    expect(result.complete).toBe(true)
    expect(result.basis).toBe(usd('532.94425'))
    expect(result.realized).toBe(0n)
    expect(result.unrealized).toBe(-usd('58.81425'))
    expect(result.total).toBe(-usd('58.81425'))
    const recovered = safeTreasuryPnl(journal, balances('0.194336006018297504', '530'), true)
    expect(recovered.basis).toBe(result.basis)
    expect(recovered.realized).toBe(0n)
    expect(recovered.total).toBe(-usd('2.94425'))
    expect(recovered.positions.find((row) => row.quantity > 0n)?.total).toBe(recovered.total)
    for (const reference of [0, 2711.97038, 5000]) {
      const replay = finalizeJournalEntryDrafts(drafts(rows, reference)).journal
      expect(safeTreasuryPnl(replay, balances('0.194336006018297504', '530'), true)).toEqual(
        recovered
      )
    }
  })
  it('[AC-US-SAFE-002-11] keeps realized profits after the token position is closed', () => {
    const journal = finalizeJournalEntryDrafts(drafts(history(), 2000)).journal
    const data: SafeClientBalances = {
      fiatTotal: '30.658984',
      items: [
        {
          tokenInfo: {
            type: 'ERC20',
            address: history()[0]!.tokenAddress!,
            name: 'USD Coin',
            symbol: 'USDC',
            decimals: 6,
            logoUri: null
          },
          balance: '30658984',
          fiatConversion: '1',
          fiatBalance: '30.658984'
        }
      ]
    }
    const result = safeTreasuryPnl(journal, data, true)
    expect(result.complete).toBe(true)
    expect(result.total).toBe(usd('10.658984'))
    expect(result.positions.find((row) => row.token.startsWith('erc20:'))).toMatchObject({
      quantity: 0n,
      realized: usd('10.658984'),
      unrealized: 0n
    })
  })
  it('keeps exact cost and available P&L when acquisition unit cost rounds below display precision', () => {
    const rows = history().slice(0, 3)
    rows[2]!.value = parseUnits('100000000', 18).toString()
    const journal = finalizeJournalEntryDrafts(drafts(rows, 0)).journal
    const result = safeTreasuryPnl(journal, balances('100000000', '25'), true)
    expect(result.complete).toBe(true)
    expect(result.basis).toBe(usd('20'))
    expect(result.total).toBe(usd('5'))
  })
  it('does not call a deposit profit and updates only unrealized P&L with market prices', () => {
    const journal = finalizeJournalEntryDrafts(drafts(history().slice(0, 3), 2000)).journal
    expect(safeTreasuryPnl(journal, balances('0.01', '20'), true).total).toBe(0n)
    const up = safeTreasuryPnl(journal, balances('0.01', '30'), true)
    expect(up.total).toBe(usd(10))
    expect(up.realized).toBe(0n)
    expect(up.basis).toBe(usd(20))
  })
  it('ignores an unsolicited token held by the Safe that no price source knows', () => {
    const journal = finalizeJournalEntryDrafts(drafts(history().slice(0, 3), 2000)).journal
    const data = balances('0.01', '20')
    data.items.push({
      tokenInfo: {
        type: 'ERC20',
        address: '0x7525A2c3E099F451830E31684736bB1B92C16D34',
        name: 'Claim your SHIB reward',
        symbol: 'SWAP ✅ t .me/s/sol_shiba',
        decimals: 0,
        logoUri: null
      },
      balance: '1',
      fiatConversion: '0',
      fiatBalance: '0'
    })
    const result = safeTreasuryPnl(journal, data, true)
    expect(result.complete).toBe(true)
    expect(result.total).toBe(0n)
    expect(result.positions.some((row) => row.symbol.startsWith('SWAP'))).toBe(false)
  })
  it('[AC-US-SAFE-002-12] withholds totals on quantity mismatch, missing rates and incomplete history', () => {
    const journal = finalizeJournalEntryDrafts(drafts(history().slice(0, 3), 2000)).journal
    for (const result of [
      safeTreasuryPnl(journal, balances('0.02', '40'), true),
      safeTreasuryPnl(journal, balances('0.01', '20'), false),
      safeTreasuryPnl(journal, undefined, true)
    ]) {
      expect(result.complete).toBe(false)
      expect(result.total).toBeNull()
    }
    expect(
      safeTreasuryPnl(journal, balances('0.02', '40'), true).positions.find(
        (row) => row.token === assetId(TOKEN, row.asset?.chainId ?? 0)
      )?.reason
    ).toContain('do not match')
  })
  it('keeps both purchase costs and moves a partial disposal profit from unrealized to realized once', () => {
    const rows = [
      transfer(1, 0, ADDR.client, ADDR.safe, USDC_ADDRESS, '100000000'),
      transfer(2, 0, ADDR.safe, ROUTER, USDC_ADDRESS, '100000000'),
      transfer(2, 1, ROUTER, ADDR.safe, TOKEN, '1000000000000000000'),
      transfer(3, 0, ADDR.client, ADDR.safe, USDC_ADDRESS, '100000000'),
      transfer(4, 0, ADDR.safe, ROUTER, USDC_ADDRESS, '100000000'),
      transfer(4, 1, ROUTER, ADDR.safe, TOKEN, '2000000000000000000'),
      transfer(5, 0, ADDR.safe, ROUTER, TOKEN, '1000000000000000000'),
      transfer(5, 1, ROUTER, ADDR.safe, USDC_ADDRESS, '100000000')
    ]
    const valued = applyHistoricalRates(drafts(rows, 0), (_token, at) =>
      at.getUTCDate() === 4 ? 50 : 100
    )
    const before = safeTreasuryPnl(
      finalizeJournalEntryDrafts(valued.slice(0, 6)).journal,
      balances('3', '300'),
      true
    )
    expect(before.basis).toBe(usd(200))
    expect(before.realized).toBe(0n)
    expect(before.unrealized).toBe(usd(100))
    const afterBalances = balances('2', '200')
    afterBalances.items.push({
      tokenInfo: {
        type: 'ERC20',
        address: USDC_ADDRESS,
        name: 'USD Coin',
        symbol: 'USDC',
        decimals: 6,
        logoUri: null
      },
      balance: '100000000',
      fiatConversion: '1',
      fiatBalance: '100'
    })
    const after = safeTreasuryPnl(finalizeJournalEntryDrafts(valued).journal, afterBalances, true)
    expect(after.complete).toBe(true)
    expect(after.realized).toBe(usd(100) - usd(200) / 3n)
    expect(after.unrealized! + after.realized!).toBe(before.total)
    expect(after.total).toBe(usd(100))
  })
})

const usdcItem = (balance: string) => ({
  tokenInfo: {
    type: 'ERC20',
    address: USDC_ADDRESS,
    name: 'USD Coin',
    symbol: 'USDC',
    decimals: 6,
    logoUri: null
  },
  balance,
  fiatConversion: '1',
  fiatBalance: balance === '0' ? '0' : '530'
})
const feeBalances = (value: string, raw = SWAP_QUANTITY, usdc = '0'): SafeClientBalances => ({
  fiatTotal: value,
  items: [{ ...balances('0', value).items[0]!, balance: raw }, usdcItem(usdc)]
})
const withFee = (rows: SafeIncomingTransfer[], fee: (txHash?: string) => string) =>
  drafts(rows).map((entry) => ({
    ...entry,
    swapFee: { tokenAddress: USDC_ADDRESS.toLowerCase(), rawAmount: fee(entry.txHash) }
  }))

describe('Safe treasury P&L with swap fees', () => {
  it('[AC-US-ACCT-002-15] counts a verified fee once as the market moves', () => {
    const journal = finalizeJournalEntryDrafts(withFee(swapFeeInput(), () => '3870494')).journal
    for (const [market, expected] of [
      ['474.13', -usd('58.81425')],
      ['530', -usd('2.94425')],
      ['550', usd('17.05575')]
    ] as const) {
      const pnl = safeTreasuryPnl(journal, feeBalances(market), true)
      expect(pnl.complete).toBe(true)
      expect(pnl.total).toBe(expected)
      expect(pnl.fees).toBe(usd('3.870494'))
      expect(pnl.basis).toBe(usd('529.073756'))
    }
  })
  it('keeps the net weighted-average cost after a partial sale without charging fees twice', () => {
    const rows = swapFeeInput()
    rows[0]!.value = (2n * BigInt(SWAP_AMOUNT)).toString()
    rows.push(
      transfer(3, 0, ADDR.safe, ROUTER, USDC_ADDRESS, SWAP_AMOUNT),
      transfer(3, 1, ROUTER, ADDR.safe, TOKEN, SWAP_QUANTITY),
      transfer(4, 0, ADDR.safe, ROUTER, TOKEN, SWAP_QUANTITY),
      transfer(4, 1, ROUTER, ADDR.safe, USDC_ADDRESS, '530000000')
    )
    const journal = finalizeJournalEntryDrafts(
      withFee(rows, (txHash) => (txHash === tx(4) ? '1000000' : '3870494'))
    ).journal
    const pnl = safeTreasuryPnl(journal, feeBalances('530', SWAP_QUANTITY, '530000000'), true)
    expect(pnl.total).toBe(-usd('5.8885'))
    expect(pnl.fees).toBe(usd('8.740988'))
    expect(pnl.positions.find((row) => row.asset?.address === TOKEN)?.basis).toBe(usd('529.073756'))
  })
  it('retains the full result on a closed position and preserves net stablecoin sale proceeds', () => {
    const rows = swapFeeInput()
    rows.push(
      transfer(3, 0, ADDR.safe, ROUTER, TOKEN, SWAP_QUANTITY),
      transfer(3, 1, ROUTER, ADDR.safe, USDC_ADDRESS, '530000000')
    )
    const journal = finalizeJournalEntryDrafts(
      withFee(rows, (txHash) => (txHash === tx(3) ? '1000000' : '3870494'))
    ).journal
    const pnl = safeTreasuryPnl(journal, feeBalances('0', '0', '530000000'), true)
    expect(pnl.total).toBe(-usd('2.94425'))
    expect(pnl.positions.find((row) => row.asset?.address === TOKEN)).toMatchObject({
      quantity: 0n,
      basis: 0n,
      total: -usd('2.94425')
    })
  })
  it('gives the same total P&L when the fee cannot be verified', () => {
    const journal = finalizeJournalEntryDrafts(drafts(swapFeeInput())).journal
    const pnl = safeTreasuryPnl(journal, feeBalances('530'), true)
    expect(pnl.total).toBe(-usd('2.94425'))
    expect(pnl.fees).toBe(0n)
  })
})
