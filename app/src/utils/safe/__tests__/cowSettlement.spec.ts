import { describe, expect, it } from 'vitest'
import { encodeAbiParameters, encodeEventTopics, parseAbi, type TransactionReceipt } from 'viem'
import { cowTradesFromReceipt, verifyCowFees } from '../cowSettlement'
import { swapFeeFixture, SETTLEMENT } from '@/utils/accounting/__tests__/swapFeeFixtures'
import { ADDR } from '@/utils/accounting/__tests__/fixtures'

describe('CoW receipt evidence', () => {
  it('decodes only authentic settlement Trade logs on the supported network', () => {
    const { trade } = swapFeeFixture()
    const log = {
      address: SETTLEMENT,
      logIndex: trade.logIndex,
      topics: encodeEventTopics({
        abi: parseAbi([
          'event Trade(address indexed owner, address sellToken, address buyToken, uint256 sellAmount, uint256 buyAmount, uint256 feeAmount, bytes orderUid)'
        ]),
        eventName: 'Trade',
        args: { owner: ADDR.safe }
      }),
      data: encodeAbiParameters(
        [
          { type: 'address' },
          { type: 'address' },
          { type: 'uint256' },
          { type: 'uint256' },
          { type: 'uint256' },
          { type: 'bytes' }
        ],
        [
          trade.sellToken as `0x${string}`,
          trade.buyToken as `0x${string}`,
          BigInt(trade.sellAmount),
          BigInt(trade.buyAmount),
          0n,
          trade.orderUid as `0x${string}`
        ]
      )
    }
    const receipt = {
      logs: [log, { ...log, address: ADDR.client }, { ...log, data: '0x' }]
    } as Pick<TransactionReceipt, 'logs'>
    expect(cowTradesFromReceipt(receipt, 137)).toEqual([
      {
        owner: trade.owner,
        orderUid: trade.orderUid,
        sellToken: trade.sellToken,
        buyToken: trade.buyToken,
        sellAmount: trade.sellAmount,
        buyAmount: trade.buyAmount,
        logIndex: trade.logIndex
      }
    ])
    expect(cowTradesFromReceipt(receipt, 1)).toEqual([])
  })
})

describe('CoW fee verification', () => {
  it('[AC-US-ACCT-002-15] returns the exact settled fee and its protocol breakdown in base units', () => {
    const { target, execution, order, trade } = swapFeeFixture()
    expect(verifyCowFees(target, execution, [order], [trade])).toEqual({
      fees: [{ tokenAddress: order.executedFeeToken, rawAmount: '3870494' }],
      protocolFees: trade.executedProtocolFees!.map((fee) => ({
        tokenAddress: fee.token,
        rawAmount: fee.amount,
        policy: fee.policy
      }))
    })
  })
  it.each(['owner', 'receiver', 'settlementContract', 'sellToken'] as const)(
    'withholds fee evidence from another order %s',
    (field) => {
      const { target, execution, order, trade } = swapFeeFixture()
      order[field] = ADDR.founder
      expect(verifyCowFees(target, execution, [order], [trade]).fees).toBeNull()
    }
  )
  it.each(['txHash', 'blockNumber', 'logIndex', 'sellAmount'] as const)(
    'withholds a provider trade with a different %s',
    (field) => {
      const { target, execution, order, trade } = swapFeeFixture()
      const changed = { ...trade, [field]: typeof trade[field] === 'number' ? 999 : '0' }
      expect(verifyCowFees(target, execution, [order], [changed])).toMatchObject({
        fees: null,
        protocolFees: []
      })
    }
  )
  it('does not assign an order total to a partial fill, but preserves its verified breakdown', () => {
    const { target, execution, order, trade } = swapFeeFixture()
    const other = { ...trade, txHash: `0x${'c'.repeat(64)}` }
    const result = verifyCowFees(target, execution, [order], [trade, other])
    expect(result.fees).toBeNull()
    expect(result.protocolFees).toHaveLength(3)
    expect(result.reason).toContain('other fills')
  })
  it('rejects duplicate trades, unmatched token movements and incomplete route coverage', () => {
    const { target, execution, order, trade } = swapFeeFixture()
    expect(verifyCowFees(target, execution, [order], [trade, trade]).fees).toBeNull()
    target.assets[0]!.rawAmount = '1'
    expect(verifyCowFees(target, execution, [order], [trade]).reason).toContain('movements')
    target.assets = target.assets.slice(1)
    expect(verifyCowFees(target, execution, [order], [trade]).reason).toContain('movements')
  })
  it('distinguishes unavailable, zero and missing-receipt evidence', () => {
    const { target, execution, order, trade } = swapFeeFixture()
    delete order.executedFee
    expect(verifyCowFees(target, execution, [order], [trade]).fees).toBeNull()
    order.executedFee = '0'
    expect(verifyCowFees(target, execution, [order], [trade]).fees).toEqual([
      { tokenAddress: order.executedFeeToken, rawAmount: '0' }
    ])
    expect(verifyCowFees(target, undefined, [order], [trade]).reason).toContain('unavailable')
    expect(verifyCowFees(target, { ...execution, cowTrades: [] }, [], []).reason).toContain(
      'unavailable'
    )
  })
  it('keeps unrelated settlement owners out and totals each order only once across same-transaction fills', () => {
    const { target, execution, order, trade } = swapFeeFixture()
    const second = { ...trade, logIndex: 245 }
    execution.cowTrades = [trade, second, { ...trade, owner: ADDR.founder }]
    target.assets = target.assets.map((asset) => ({
      ...asset,
      rawAmount: (2n * BigInt(asset.rawAmount)).toString()
    }))
    order.executedSellAmount = (2n * BigInt(trade.sellAmount)).toString()
    order.executedBuyAmount = (2n * BigInt(trade.buyAmount)).toString()
    expect(verifyCowFees(target, execution, [order], [trade, second]).fees).toEqual([
      { tokenAddress: order.executedFeeToken, rawAmount: '3870494' }
    ])
  })
})
