import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { useCommunityCreditStore } from '@/stores/communityCredit'
import type { CreditCallForm } from '@/types'

function makeForm(overrides: Partial<CreditCallForm> = {}): CreditCallForm {
  return {
    name: 'New round',
    desc: 'desc',
    target: '30000',
    token: 'USDC',
    rate: '7',
    period: 60,
    deadline: '2026-09-01',
    access: 'everyone',
    whitelist: {},
    capOn: false,
    cap: '5000',
    ...overrides
  }
}

describe('Community Credit Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('initial state', () => {
    it('seeds four rounds and starts as the owner viewing the ledger', () => {
      const store = useCommunityCreditStore()
      expect(store.rounds).toHaveLength(4)
      expect(store.role).toBe('owner')
      expect(store.isOwner).toBe(true)
      expect(store.variant).toBe('ledger')
    })

    it('splits rounds into active and history buckets', () => {
      const store = useCommunityCreditStore()
      expect(store.activeRounds.map((r) => r.id)).toEqual(['q3', 'hw'])
      expect(store.historyRounds.map((r) => r.id)).toEqual(['audit', 'spring'])
    })
  })

  describe('account stats', () => {
    it('derives the credit-account figures from the seed', () => {
      const store = useCommunityCreditStore()
      expect(store.outstandingPrincipal).toBe(48400)
      expect(store.interestDue).toBe(2670) // 23400*5% + 25000*6%
      expect(store.lenderPositions).toBe(8)
      expect(store.raisedLifetime).toBe(66400)
      expect(store.repaidLifetime).toBe(18990) // 18000 + 5.5%
      expect(store.nextMaturity).toBe('Aug 14') // the in-repayment round
    })
  })

  describe('setRole / setVariant', () => {
    it('switches the demo role and detail layout', () => {
      const store = useCommunityCreditStore()
      store.setRole('lender')
      expect(store.isLender).toBe(true)
      expect(store.isOwner).toBe(false)
      store.setVariant('gauge')
      expect(store.variant).toBe('gauge')
    })
  })

  describe('lend', () => {
    it('merges into the existing "You" position and returns the amount added', () => {
      const store = useCommunityCreditStore()
      const before = store.getRound('q3')!.raised
      const mineBefore = store.getRound('q3')!.lenders.find((l) => l.you)!.amount

      const added = store.lend('q3', 1000)

      expect(added).toBe(1000)
      expect(store.getRound('q3')!.raised).toBe(before + 1000)
      expect(store.getRound('q3')!.lenders.find((l) => l.you)!.amount).toBe(mineBefore + 1000)
    })

    it('clamps to the remaining capacity and flips the round to funded', () => {
      const store = useCommunityCreditStore()
      const round = store.getRound('q3')!
      const remaining = round.target - round.raised

      const added = store.lend('q3', remaining + 5000)

      expect(added).toBe(remaining)
      expect(store.getRound('q3')!.raised).toBe(round.target)
      expect(store.getRound('q3')!.status).toBe('funded')
    })

    it('adds a new "You" lender when the user has no position yet', () => {
      const store = useCommunityCreditStore()
      const round = store.getRound('hw')!
      // hw is fully funded, so lend against a fresh open round instead.
      const id = store.createRound(makeForm({ name: 'Fresh', target: '10000' }))
      const added = store.lend(id, 2500)

      expect(added).toBe(2500)
      const created = store.getRound(id)!
      expect(created.lenders).toHaveLength(1)
      expect(created.lenders[0]?.you).toBe(true)
      expect(round.status).toBe('active') // untouched
    })

    it('ignores unknown rounds and non-positive amounts', () => {
      const store = useCommunityCreditStore()
      expect(store.lend('does-not-exist', 1000)).toBe(0)
      expect(store.lend('q3', 0)).toBe(0)
      expect(store.lend('q3', -50)).toBe(0)
    })
  })

  describe('repay', () => {
    it('marks a round repaid', () => {
      const store = useCommunityCreditStore()
      expect(store.repay('hw')).toBe(true)
      const round = store.getRound('hw')!
      expect(round.status).toBe('repaid')
      expect(round.repaidOn).toBe('today')
      expect(store.activeRounds.map((r) => r.id)).toEqual(['q3'])
    })

    it('returns false for an unknown round', () => {
      const store = useCommunityCreditStore()
      expect(store.repay('nope')).toBe(false)
    })
  })

  describe('createRound', () => {
    it('publishes an open round at the top of the list with mapped fields', () => {
      const store = useCommunityCreditStore()
      const id = store.createRound(
        makeForm({
          name: '  Q4 bridge  ',
          target: '40000',
          access: 'restricted',
          capOn: true,
          cap: '8000'
        })
      )
      const round = store.getRound(id)!

      expect(store.rounds[0]?.id).toBe(id)
      expect(round.name).toBe('Q4 bridge')
      expect(round.status).toBe('open')
      expect(round.raised).toBe(0)
      expect(round.target).toBe(40000)
      expect(round.restricted).toBe(true)
      expect(round.cap).toBe(8000)
      expect(round.lenders).toEqual([])
    })

    it('falls back to defaults for blank name and disabled cap', () => {
      const store = useCommunityCreditStore()
      const id = store.createRound(makeForm({ name: '   ', desc: '', capOn: false }))
      const round = store.getRound(id)!
      expect(round.name).toBe('Untitled round')
      expect(round.desc).toBe('New credit round.')
      expect(round.cap).toBeNull()
    })
  })

  describe('resetDemo', () => {
    it('restores seed rounds, balance, role and variant', () => {
      const store = useCommunityCreditStore()
      store.lend('q3', 1000)
      store.setRole('lender')
      store.setVariant('timeline')

      store.resetDemo()

      expect(store.rounds).toHaveLength(4)
      expect(store.getRound('q3')!.raised).toBe(23400)
      expect(store.role).toBe('owner')
      expect(store.variant).toBe('ledger')
    })
  })
})
