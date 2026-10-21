import { describe, expect, it } from 'vitest'
import { USDC_ADDRESS } from '@/constant'
import { finalizeJournalEntryDrafts } from '../journalEntry'
import { attachSwapFees, executedFeeUsd, swapFeeTargets } from '../swapFees'
import { drafts, history, transfer, TOKEN, ROUTER, tx } from './safeExchangeFixtures'
import { swapFeeInput, SWAP_AMOUNT, SWAP_QUANTITY } from './swapFeeFixtures'
import { ADDR, usd } from './fixtures'

describe('Safe swap net value and fee accounting', () => {
  it('[AC-US-ACCT-002-15] balances spent = net asset + fee, preserving raw receipts', () => {
    const posted = drafts(swapFeeInput()).map((entry) => ({
      ...entry,
      swapFee: { tokenAddress: USDC_ADDRESS.toLowerCase(), rawAmount: '3870494' }
    }))
    const result = finalizeJournalEntryDrafts(posted)
    expect(result.assetDiagnostics).toEqual([])
    const swap = result.journal.find((entry) => entry.useCase === 'SAFE-SWAP')!
    const asset = swap.lines.find((line) => line.movement?.asset?.address === TOKEN)!
    expect(asset.debit).toBe(usd('529.073756'))
    expect(asset.movement!.rawAmount).toBe(BigInt(SWAP_QUANTITY))
    expect(
      swap.lines.find((line) => line.account.family.name === 'Transaction Fee Expense')!.debit
    ).toBe(usd('3.870494'))
    expect(swap.lines.some((line) => line.account.family.name === 'Asset Exchange Loss')).toBe(
      false
    )
    expect(
      swap.lines.reduce((sum, line) => sum + (line.debit ?? 0n) - (line.credit ?? 0n), 0n)
    ).toBe(0n)
  })
  it('replays two purchases and a partial sale using the net weighted-average cost without charging fees twice', () => {
    const rows = swapFeeInput()
    rows[0]!.value = (2n * BigInt(SWAP_AMOUNT)).toString()
    rows.push(
      transfer(3, 0, ADDR.safe, ROUTER, USDC_ADDRESS, SWAP_AMOUNT),
      transfer(3, 1, ROUTER, ADDR.safe, TOKEN, SWAP_QUANTITY),
      transfer(4, 0, ADDR.safe, ROUTER, TOKEN, SWAP_QUANTITY),
      transfer(4, 1, ROUTER, ADDR.safe, USDC_ADDRESS, '530000000')
    )
    const posted = drafts(rows).map((entry) => ({
      ...entry,
      swapFee: {
        tokenAddress: USDC_ADDRESS.toLowerCase(),
        rawAmount: entry.txHash === tx(4) ? '1000000' : '3870494'
      }
    }))
    const result = finalizeJournalEntryDrafts(posted)
    expect(result.assetDiagnostics).toEqual([])
    const sale = result.journal.at(-1)!
    expect(sale.lines.find((line) => line.movement?.token === 'usdc')?.debit).toBe(usd(530))
    expect(sale.lines.find((line) => line.movement?.asset?.address === TOKEN)?.credit).toBe(
      usd('529.073756')
    )
    expect(
      sale.lines.find((line) => line.account.family.name === 'Transaction Fee Expense')?.debit
    ).toBe(usd(1))
  })
  it('keeps an unverified fee inside the asset cost without blocking the books', () => {
    const result = finalizeJournalEntryDrafts(drafts(swapFeeInput()))
    expect(result.assetDiagnostics).toEqual([])
    expect(
      result.journal
        .flatMap((entry) => entry.lines)
        .some((line) => line.account.family.name === 'Transaction Fee Expense')
    ).toBe(false)
    const swap = result.journal.find((entry) => entry.useCase === 'SAFE-SWAP')!
    expect(swap.lines.find((line) => line.movement?.asset?.address === TOKEN)!.debit).toBe(
      usd('532.94425')
    )
    const posted = drafts(swapFeeInput()).filter((entry) => entry.useCase === 'SAFE-SWAP')
    expect(
      executedFeeUsd(
        posted.map((entry) => ({
          ...entry,
          swapFee: { tokenAddress: ADDR.founder, rawAmount: '123' }
        }))
      )
    ).toBe(0n)
  })
  it('values a fee in the received asset from execution amounts without another market quote', () => {
    const posted = drafts(history().slice(0, 3)).filter((entry) => entry.useCase === 'SAFE-SWAP')
    // 20 USDC spent, 0.01 token received, 0.001 token withheld: the gross received quantity is 0.011.
    const fee = executedFeeUsd(
      posted.map((entry) => ({
        ...entry,
        swapFee: { tokenAddress: TOKEN, rawAmount: '1000000000000000' }
      }))
    )
    expect(fee).toBe(usd(20) / 11n)
    expect(
      executedFeeUsd(
        posted.map((entry) => ({
          ...entry,
          rate: entry.credit ? 1 : 9999,
          swapFee: { tokenAddress: TOKEN, rawAmount: '1000000000000000' }
        }))
      )
    ).toBe(fee)
  })
  it('values a sale fee in the spent asset against actual net stablecoin proceeds', () => {
    const posted = drafts().filter((entry) => entry.txHash === tx(3))
    // Net receipt is 30.658984 USDC for 0.01 token spent including a 0.001 token fee.
    expect(
      executedFeeUsd(
        posted.map((entry) => ({
          ...entry,
          swapFee: { tokenAddress: TOKEN, rawAmount: '1000000000000000' }
        }))
      )
    ).toBe(usd('30.658984') / 9n)
    expect(
      executedFeeUsd(
        posted.map((entry) => ({
          ...entry,
          swapFee: { tokenAddress: TOKEN, rawAmount: '10000000000000000' }
        }))
      )
    ).toBe(0n)
  })
  it('reads one lookup target per swap straight from the drafts, newest first', () => {
    const targets = swapFeeTargets(drafts())
    expect(targets.map((target) => target.txHash)).toEqual([tx(3), tx(2)])
    expect(targets[1]).toMatchObject({
      safeAddress: ADDR.safe.toLowerCase(),
      assets: [
        {
          address: USDC_ADDRESS.toLowerCase(),
          token: 'usdc',
          rawAmount: '20000000',
          side: 'spent'
        },
        { address: TOKEN, rawAmount: '10000000000000000', side: 'received' }
      ]
    })
  })
  it('attaches a verified fee only to the drafts of its own swap', () => {
    const fee = { tokenAddress: USDC_ADDRESS.toLowerCase(), rawAmount: '3870494' }
    const result = attachSwapFees(drafts(), new Map([[tx(2), fee]]))
    expect(result.filter((entry) => entry.swapFee).map((entry) => entry.txHash)).toEqual([
      tx(2),
      tx(2)
    ])
    expect(attachSwapFees(drafts(), new Map()).some((entry) => entry.swapFee)).toBe(false)
  })
})
