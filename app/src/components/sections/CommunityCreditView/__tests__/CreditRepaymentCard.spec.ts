import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import type { CreditRound } from '@/types'
import { MINUTES_PER_DAY } from '@/utils/communityCredit/model'
import CreditRepaymentCard from '../CreditRepaymentCard.vue'

function makeRound(overrides: Partial<CreditRound> = {}): CreditRound {
  return {
    id: '1',
    name: 'Q3 runway bridge',
    token: 'USDC',
    target: 1000,
    raised: 1000,
    totalRepaid: 0,
    rate: 6,
    period: 90 * MINUTES_PER_DAY,
    termLabel: '90 days',
    status: 'funded',
    fundable: false,
    opened: 'Jun 1',
    deadline: 'Jun 28',
    maturity: 'Oct 26',
    restricted: false,
    cap: null,
    desc: 'Working capital.',
    lenders: [],
    ...overrides
  }
}

describe('CreditRepaymentCard', () => {
  it('renders principal, interest and total due', () => {
    const wrapper = mount(CreditRepaymentCard, { props: { round: makeRound() } })

    expect(wrapper.text()).toContain('1,000 USDC')
    expect(wrapper.text()).toContain('6%')
    expect(wrapper.text()).toContain('60 USDC')
    expect(wrapper.text()).toContain('1,060 USDC')
    expect(wrapper.text()).toContain('Oct 26')
  })

  it("renders every amount in the round's own token, not a hardcoded default", () => {
    // Regression test: every formatAmount() call here used to omit the token
    // argument, silently defaulting to 'USDC' regardless of the round's
    // actual token — invisible in the test above because its fixture already
    // used 'USDC'. A non-USDC token is the only way to catch this.
    const wrapper = mount(CreditRepaymentCard, {
      props: { round: makeRound({ token: 'USDCe' }) }
    })

    expect(wrapper.text()).toContain('1,000 USDCe')
    expect(wrapper.text()).toContain('60 USDCe')
    expect(wrapper.text()).toContain('1,060 USDCe')
    expect(wrapper.text()).not.toContain('USDC ')
  })
})
