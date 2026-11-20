import { describe, expect, it } from 'vitest'
import type { PolygonTokenTransfer } from '~/api/polygonscan'
import type { PolymarketActivity, PolymarketPosition } from '~/types/polymarket'
import { buildLedger } from '~/utils/accounting'
import { buildBalanceSheet } from '~/utils/balanceSheet'
import { buildGeneralLedger } from '~/utils/generalLedger'
import { buildIncomeStatement, computeRealizedTrades, type RealizedTrade } from '~/utils/incomeStatement'

const WALLET = '0x1d2b88f987e96dece7cf445d14d31b1c38c847d0'
const EXCHANGE = '0x4bfb41d5b3570defd03c39a9a4d8de6bd8b8982e'
const MARKET = { asset: 'token-yes', conditionId: '0xcondition' as const, outcomeIndex: 0, title: 'Will it rain?', outcome: 'Yes' }

const BUY_AT = 1_000
const SELL_AT = 2_000

/** Buys 10 shares quoted at 0.40 and pays 4.04 — a 0.04 fee baked into the fill. */
const buy: PolymarketActivity = {
  ...MARKET,
  type: 'TRADE',
  side: 'BUY',
  size: 10,
  price: 0.4,
  usdcSize: 4.04,
  timestamp: BUY_AT,
  transactionHash: '0xbuy'
}

/** Sells the 10 shares quoted at 0.60 and receives 5.94 — a 0.06 fee withheld. */
const sell: PolymarketActivity = {
  ...MARKET,
  type: 'TRADE',
  side: 'SELL',
  size: 10,
  price: 0.6,
  usdcSize: 5.94,
  timestamp: SELL_AT,
  transactionHash: '0xsell'
}

function usdcTransfer({ hash, from, to, amount, timestamp }: {
  hash: string
  from: string
  to: string
  amount: number
  timestamp: number
}): PolygonTokenTransfer {
  return {
    blockNumber: '1',
    timeStamp: String(timestamp),
    hash,
    from,
    to,
    value: String(Math.round(amount * 1e6)),
    contractAddress: '0xusdc',
    tokenName: 'USD Coin',
    tokenSymbol: 'USDC',
    tokenDecimal: '6'
  }
}

const deposit = usdcTransfer({ hash: '0xdeposit', from: EXCHANGE, to: WALLET, amount: 10, timestamp: 500 })
const buySettlement = usdcTransfer({ hash: '0xbuy', from: WALLET, to: EXCHANGE, amount: 4.04, timestamp: BUY_AT })
const sellSettlement = usdcTransfer({ hash: '0xsell', from: EXCHANGE, to: WALLET, amount: 5.94, timestamp: SELL_AT })

describe('income statement trading fees', () => {
  it('[AC-US-POLY-ACCOUNTING-003-11] measures a round trip before fees and charges the fees once as expenses', () => {
    const statement = buildIncomeStatement({ activities: [buy, sell], positions: [] })

    expect(statement.wins).toBeCloseTo(2, 6)
    expect(statement.losses).toBe(0)
    expect(statement.expenses).toBeCloseTo(0.1, 6)
    expect(statement.netIncome).toBeCloseTo(1.9, 6)
  })

  it('[AC-US-POLY-ACCOUNTING-003-11] counts only the sale fee when the period holds only the sale', () => {
    const statement = buildIncomeStatement({
      activities: [buy, sell],
      positions: [],
      periodStart: SELL_AT - 1,
      periodEnd: SELL_AT + 1
    })

    expect(statement.wins).toBeCloseTo(2, 6)
    expect(statement.expenses).toBeCloseTo(0.06, 6)
    expect(statement.netIncome).toBeCloseTo(1.94, 6)
  })

  it('reports no expenses without trades', () => {
    const statement = buildIncomeStatement({ activities: [], positions: [] })

    expect(statement.expenses).toBe(0)
    expect(statement.netIncome).toBe(0)
  })

  it('charges no fee on a redeem, which settles at par', () => {
    const redeem: PolymarketActivity = { ...MARKET, type: 'REDEEM', size: 10, price: 1, usdcSize: 10, timestamp: SELL_AT }

    const [trade] = computeRealizedTrades([buy, redeem], [])

    expect(trade).toMatchObject({ kind: 'REDEEM', fee: 0 })
    expect(trade!.proceeds).toBeCloseTo(10, 6)
    expect(trade!.realizedPnl).toBeCloseTo(6, 6)
  })

  it('keeps the entry fee out of the unrealized result of an open position', () => {
    const openPosition: PolymarketPosition = { ...MARKET, size: 10, currentValue: 3, cashPnl: -1 }

    const statement = buildIncomeStatement({ activities: [buy], positions: [openPosition] })

    expect(statement.expenses).toBeCloseTo(0.04, 6)
    expect(statement.comprehensiveNetIncome).toBeCloseTo(-1.04, 6)
  })
})

describe('statements with trading fees stay balanced', () => {
  const realizedTrades = computeRealizedTrades([buy, sell], [])
  const { entries, summary } = buildLedger({
    proxyWallet: WALLET,
    activities: [buy, sell],
    positions: [],
    transfers: [deposit, buySettlement, sellSettlement],
    realizedTrades
  })

  it('reconciles the summary total return with fees counted once', () => {
    expect(summary.totalFees).toBeCloseTo(0.1, 6)
    expect(summary.realizedPnl).toBeCloseTo(2, 6)
    expect(summary.totalReturn).toBeCloseTo(1.9, 6)
    expect(summary.reconciliationGap).toBeCloseTo(0, 6)
  })

  it('books the fees in their own general-ledger account and balances', () => {
    const ledger = buildGeneralLedger({ ledgerEntries: entries, realizedTrades })
    const balanceOf = (account: string) => ledger.trialBalance.find(row => row.account === account)?.balance

    expect(ledger.balanced).toBe(true)
    expect(balanceOf('Trading Fees')).toBeCloseTo(0.1, 6)
    expect(balanceOf('Trading Gains')).toBeCloseTo(2, 6)
    expect(balanceOf('Cash')).toBeCloseTo(11.9, 6)
    expect(balanceOf('Open Contracts')).toBeCloseTo(0, 6)
  })

  it('deducts the fees from retained earnings and balances the sheet', () => {
    const sheet = buildBalanceSheet({ ledgerEntries: entries, realizedTrades, positions: [] })

    expect(sheet.tradingFees).toBeCloseTo(0.1, 6)
    expect(sheet.retainedEarnings).toBeCloseTo(1.9, 6)
    expect(sheet.identityGap).toBeCloseTo(0, 6)
  })

  it('carries an open position at cost before fees', () => {
    const positions: PolymarketPosition[] = [{ ...MARKET, size: 10, currentValue: 3, cashPnl: -1 }]
    const openTrades = computeRealizedTrades([buy], positions)
    const openLedger = buildLedger({ proxyWallet: WALLET, activities: [buy], positions, transfers: [], realizedTrades: openTrades })

    const sheet = buildBalanceSheet({ ledgerEntries: openLedger.entries, realizedTrades: openTrades, positions })

    expect(sheet.openContractsAtCost).toBeCloseTo(4, 6)
    expect(sheet.identityGap).toBeCloseTo(0, 6)
  })
})

describe('deposits and withdrawals read from the on-chain transfers', () => {
  const VAULT = '0xc417fd0000000000000000000000000000009db1'
  const PUSD = '0xc011a7e12a19f7b1f670d46f03b03f3342e82dfb'
  const PAYEE = '0x4cd00e0000000000000000000000000000000001'
  const withdrawalLegs = [
    usdcTransfer({ hash: '0xwithdrawal', from: WALLET, to: PUSD, amount: 10, timestamp: SELL_AT }),
    usdcTransfer({ hash: '0xwithdrawal', from: VAULT, to: WALLET, amount: 10, timestamp: SELL_AT }),
    usdcTransfer({ hash: '0xwithdrawal', from: WALLET, to: PAYEE, amount: 10, timestamp: SELL_AT })
  ]
  const { entries, summary } = buildLedger({
    proxyWallet: WALLET,
    activities: [],
    positions: [],
    transfers: [deposit, ...withdrawalLegs],
    realizedTrades: []
  })

  it('books a withdrawal that moves several stablecoins in one transaction once, for its net amount', () => {
    const withdrawals = entries.filter(entry => entry.category === 'WITHDRAWAL')

    expect(withdrawals).toHaveLength(1)
    expect(withdrawals[0]).toMatchObject({ amount: 10, cashFlow: -10, counterparty: PAYEE })
  })

  it('counts no deposit for the vault leg of a withdrawal', () => {
    expect(summary.totalDeposits).toBeCloseTo(10, 6)
    expect(summary.totalWithdrawals).toBeCloseTo(10, 6)
    expect(summary.netDeposits).toBeCloseTo(0, 6)
  })

  it('books no entry for a transaction whose legs cancel out', () => {
    const swap = [
      usdcTransfer({ hash: '0xswap', from: WALLET, to: PUSD, amount: 5, timestamp: SELL_AT }),
      usdcTransfer({ hash: '0xswap', from: PUSD, to: WALLET, amount: 5, timestamp: SELL_AT })
    ]

    const ledger = buildLedger({ proxyWallet: WALLET, activities: [], positions: [], transfers: swap, realizedTrades: [] })

    expect(ledger.entries).toEqual([])
  })
})

describe('splits and merges, whose v2 rows name only the condition', () => {
  const completeSets = { conditionId: MARKET.conditionId, title: MARKET.title, asset: '', outcomeIndex: 999, size: 2, usdcSize: 2 }
  const split: PolymarketActivity = { ...completeSets, type: 'SPLIT', price: 0.5, timestamp: BUY_AT, transactionHash: '0xsplit' }
  const merge: PolymarketActivity = { ...completeSets, type: 'MERGE', price: 0, timestamp: SELL_AT, transactionHash: '0xmerge' }
  const sum = (trades: RealizedTrade[], field: 'costBasis' | 'realizedPnl') =>
    trades.reduce((total, trade) => total + trade[field], 0)

  it('[AC-US-POLY-ACCOUNTING-003-12] disposes of both outcomes at cost when a merge undoes a split', () => {
    const trades = computeRealizedTrades([split, merge], [])

    expect(trades.map(trade => trade.kind)).toEqual(['MERGE', 'MERGE'])
    expect(sum(trades, 'costBasis')).toBeCloseTo(2, 6)
    expect(sum(trades, 'realizedPnl')).toBeCloseTo(0, 6)
  })

  it('[AC-US-POLY-ACCOUNTING-003-12] costs each outcome of a split at half the split when one of them is sold', () => {
    const saleOfYes: PolymarketActivity = { ...sell, size: 2, price: 0.75, usdcSize: 1.5 }

    const [trade] = computeRealizedTrades([split, saleOfYes], [])

    expect(trade).toMatchObject({ kind: 'SELL', asset: MARKET.asset })
    expect(trade!.costBasis).toBeCloseTo(1, 6)
    expect(trade!.realizedPnl).toBeCloseTo(0.5, 6)
  })

  it('[AC-US-POLY-ACCOUNTING-003-12] balances the sheet and leaves no open contract after a split and its merge', () => {
    const splitSettlement = usdcTransfer({ hash: '0xsplit', from: WALLET, to: EXCHANGE, amount: 2, timestamp: BUY_AT })
    const mergeSettlement = usdcTransfer({ hash: '0xmerge', from: EXCHANGE, to: WALLET, amount: 2, timestamp: SELL_AT })
    const realizedTrades = computeRealizedTrades([split, merge], [])
    const { entries } = buildLedger({
      proxyWallet: WALLET,
      activities: [split, merge],
      positions: [],
      transfers: [deposit, splitSettlement, mergeSettlement],
      realizedTrades
    })

    const sheet = buildBalanceSheet({ ledgerEntries: entries, realizedTrades, positions: [] })
    const ledger = buildGeneralLedger({ ledgerEntries: entries, realizedTrades })
    const balanceOf = (account: string) => ledger.trialBalance.find(row => row.account === account)?.balance

    expect(sheet.openContractsAtCost).toBeCloseTo(0, 6)
    expect(sheet.identityGap).toBeCloseTo(0, 6)
    expect(balanceOf('Cash')).toBeCloseTo(10, 6)
    expect(balanceOf('Open Contracts')).toBeCloseTo(0, 6)
  })
})
