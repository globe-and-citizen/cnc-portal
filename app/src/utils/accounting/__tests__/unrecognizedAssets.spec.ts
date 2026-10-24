import { describe, expect, it } from 'vitest'
import type { JournalEntryDraft } from '../journalEntryDraft'
import { withoutUnrecognizedMovements } from '../unrecognizedAssets'

const SAFE = '0xeB45C366206BA9A683CF223713d463F1c83d4882'
const BANK = '0xf2b60b0Df4e112D5595EF70c85FC783FCd9A2640'
const AIRDROP = 'erc20:137:0x7525a2c3e099f451830e31684736bb1b92c16d34' as const
const WETH = 'erc20:137:0x7ceb23fd6bc0add59e62ac25578270cff1b9f619' as const

const draft = (
  token: JournalEntryDraft['token'],
  overrides: Partial<JournalEntryDraft> = {}
): JournalEntryDraft =>
  ({
    id: `${token}-${overrides.useCase ?? 'UC-BANK-02'}`,
    token,
    useCase: 'UC-BANK-02',
    sourceContract: SAFE,
    ...overrides
  }) as JournalEntryDraft

describe('unrecognized Safe movements', () => {
  it('[AC-US-SAFE-003-12] drops a Safe airdrop of a contract the Safe never swapped', () => {
    const cash = draft('usdc')
    const airdrop = draft(AIRDROP)
    const outflow = draft(AIRDROP, { useCase: 'CASH-OUT' })
    expect(withoutUnrecognizedMovements([cash, airdrop, outflow], SAFE.toLowerCase())).toEqual([
      cash
    ])
  })

  it('keeps every movement of a contract acquired through a Safe swap', () => {
    const paid = draft('usdc', { useCase: 'SAFE-SWAP' })
    const bought = draft(WETH, { useCase: 'SAFE-SWAP' })
    const sold = draft(WETH, { useCase: 'CASH-OUT' })
    expect(withoutUnrecognizedMovements([paid, bought, sold], SAFE)).toEqual([paid, bought, sold])
  })

  it('leaves other sources and an unresolved Safe untouched', () => {
    const bankToken = draft(AIRDROP, { sourceContract: BANK })
    expect(withoutUnrecognizedMovements([bankToken], SAFE)).toEqual([bankToken])
    expect(withoutUnrecognizedMovements([draft(AIRDROP)], undefined)).toHaveLength(1)
  })
})
