import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import type { CreditRound } from '@/types'

const { store } = vi.hoisted(() => ({ store: { historyRounds: [] as CreditRound[] } }))

vi.mock('@/stores/communityCredit', () => ({
  useCommunityCreditStore: () => store
}))

import CreditHistoryTable from '../CreditHistoryTable.vue'

function makeRound(overrides: Partial<CreditRound> = {}): CreditRound {
  return {
    id: '9',
    name: 'Q3 runway bridge',
    token: 'USDC',
    target: 40000,
    raised: 40000,
    rate: 5,
    period: 90,
    status: 'repaid',
    opened: 'Jun 1',
    deadline: 'Jun 28',
    maturity: 'Oct 26',
    repaidOn: 'Oct 26',
    restricted: false,
    cap: null,
    desc: 'Working capital.',
    lenders: [],
    ...overrides
  }
}

describe('CreditHistoryTable', () => {
  it('renders one row per history round with its status and outcome', () => {
    store.historyRounds = [makeRound()]
    const wrapper = mount(CreditHistoryTable)

    const row = wrapper.find('tbody tr')
    expect(row.text()).toContain('Q3 runway bridge')
    expect(row.text()).toContain('Repaid')
  })

  it('emits select with the round when a history row is clicked', async () => {
    const round = makeRound()
    store.historyRounds = [round]
    const wrapper = mount(CreditHistoryTable)

    await wrapper.find('tbody tr').trigger('click')

    expect(wrapper.emitted('select')).toEqual([[round]])
  })

  it('emits select with the round when the View button is clicked', async () => {
    const round = makeRound()
    store.historyRounds = [round]
    const wrapper = mount(CreditHistoryTable)

    await wrapper.find('button').trigger('click')

    expect(wrapper.emitted('select')).toEqual([[round]])
  })
})
