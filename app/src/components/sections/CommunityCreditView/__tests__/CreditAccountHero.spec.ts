import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'

const { store } = vi.hoisted(() => {
  const store = {
    outstandingPrincipalByToken: new Map<string, number>(),
    interestDueByToken: new Map<string, number>(),
    raisedLifetimeByToken: new Map<string, number>(),
    repaidLifetimeByToken: new Map<string, number>(),
    activeRounds: [] as unknown[],
    historyRounds: [] as unknown[],
    nextMaturity: '—'
  }
  return { store }
})

vi.mock('@/stores/communityCredit', () => ({
  useCommunityCreditStore: () => store
}))

import CreditAccountHero from '../CreditAccountHero.vue'

function resetStore(): void {
  store.outstandingPrincipalByToken = new Map()
  store.interestDueByToken = new Map()
  store.raisedLifetimeByToken = new Map()
  store.repaidLifetimeByToken = new Map()
  store.activeRounds = []
  store.historyRounds = []
  store.nextMaturity = '—'
}

describe('CreditAccountHero', () => {
  it('renders a single headline when every round shares one token', () => {
    resetStore()
    store.outstandingPrincipalByToken = new Map([['USDC', 23400]])
    store.interestDueByToken = new Map([['USDC', 1170]])
    store.raisedLifetimeByToken = new Map([['USDC', 41400]])
    store.repaidLifetimeByToken = new Map([['USDC', 18990]])

    const wrapper = mount(CreditAccountHero)

    expect(wrapper.text()).toContain('23,400 USDC')
    expect(wrapper.text()).toContain('1,170 USDC interest due at maturity')
    expect(wrapper.text()).toContain('41,400 USDC')
    expect(wrapper.text()).toContain('18,990 USDC')
    // Single-token headline doesn't parenthesize the token — nothing to disambiguate.
    expect(wrapper.text()).not.toContain('(USDC)')
  })

  it('splits the headline and stat lines per token instead of summing across them', () => {
    resetStore()
    store.outstandingPrincipalByToken = new Map([
      ['USDC', 10000],
      ['USDC.e', 7000]
    ])
    store.interestDueByToken = new Map([
      ['USDC', 500],
      ['USDC.e', 350]
    ])
    store.raisedLifetimeByToken = new Map([
      ['USDC', 10000],
      ['USDC.e', 7000]
    ])
    store.repaidLifetimeByToken = new Map([
      ['USDC', 0],
      ['USDC.e', 3000]
    ])

    const wrapper = mount(CreditAccountHero)
    const text = wrapper.text()

    // Dominant token (larger outstanding principal) leads.
    expect(text).toContain('Outstanding principal (USDC)')
    expect(text).toContain('Outstanding principal (USDC.e)')
    expect(text).toContain('10,000 USDC')
    expect(text).toContain('7,000 USDC.e')
    expect(text).toContain('10,000 USDC + 7,000 USDC.e')
    expect(text).toContain('0 USDC + 3,000 USDC.e')
  })

  it('falls back to a zeroed USDC headline when the account has no activity yet', () => {
    resetStore()

    const wrapper = mount(CreditAccountHero)

    expect(wrapper.text()).toContain('0 USDC')
    expect(wrapper.text()).not.toContain('(USDC)')
  })
})
