import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import type { CreditRound } from '@/types'
import { MINUTES_PER_DAY } from '@/utils/communityCredit/model'
import CreditConditionsCard from '../CreditConditionsCard.vue'

function makeRound(overrides: Partial<CreditRound> = {}): CreditRound {
  return {
    id: '1',
    name: 'Q3 runway bridge',
    token: 'USDC',
    target: 1000,
    raised: 400,
    totalRepaid: 0,
    rate: 10,
    period: 90 * MINUTES_PER_DAY,
    termLabel: '90 days',
    status: 'open',
    fundable: true,
    opened: 'Jun 1',
    deadline: 'Jun 28',
    maturity: 'Oct 26',
    restricted: true,
    cap: 500,
    desc: 'Working capital.',
    lenders: [],
    ...overrides
  }
}

describe('CreditConditionsCard', () => {
  it('renders restricted access, cap and date values', () => {
    const wrapper = mount(CreditConditionsCard, { props: { round: makeRound() } })

    expect(wrapper.text()).toContain('10% fixed')
    expect(wrapper.text()).toContain('90 days')
    expect(wrapper.text()).toContain('Jun 28')
    expect(wrapper.text()).toContain('Oct 26')
    expect(wrapper.text()).toContain('Restricted list')
    expect(wrapper.text()).toContain('500 USDC')
  })

  it('renders public access, no-cap and missing-date fallbacks', () => {
    const wrapper = mount(CreditConditionsCard, {
      props: {
        round: makeRound({
          deadline: '',
          maturity: '',
          restricted: false,
          cap: null
        })
      }
    })

    expect(wrapper.text()).toContain('Everyone')
    expect(wrapper.text()).toContain('No cap')
    expect(wrapper.text()).toContain('—')
  })
})
