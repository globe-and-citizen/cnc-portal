import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import type { CreditRound } from '@/types'
import { mockFixedReturnReads } from '@/tests/mocks'
import { MINUTES_PER_DAY } from '@/utils/communityCredit/model'

const { store } = vi.hoisted(() => ({ store: { isOwner: false } }))

vi.mock('@/stores/communityCredit', () => ({
  useCommunityCreditStore: () => store
}))

import CreditRoundCard from '../CreditRoundCard.vue'

function makeRound(overrides: Partial<CreditRound> = {}): CreditRound {
  return {
    id: '1',
    name: 'offering 1',
    token: 'USDC',
    target: 2,
    raised: 0,
    totalRepaid: 0,
    rate: 6,
    period: MINUTES_PER_DAY,
    termLabel: '1 day',
    status: 'open',
    fundable: true,
    opened: 'Jun 1',
    deadline: 'Aug 1',
    maturity: 'Aug 2',
    restricted: false,
    cap: null,
    desc: 'this is the first offering',
    lenders: [],
    ...overrides
  }
}

describe('CreditRoundCard', () => {
  beforeEach(() => {
    store.isOwner = false
    mockFixedReturnReads.myLenderPositions.data.value = new Map()
  })

  it('hides the Lend action on a restricted round when the viewer has no whitelist allocation, owner included', () => {
    store.isOwner = true
    const wrapper = mount(CreditRoundCard, {
      props: { round: makeRound({ restricted: true }) }
    })

    expect(wrapper.find('[data-test="round-cta-lend"]').exists()).toBe(false)
  })

  it('shows the Lend action on a restricted round once the viewer has a whitelist allocation', () => {
    mockFixedReturnReads.myLenderPositions.data.value = new Map([
      [1, { allocation: 500n, deposited: 0n }]
    ])
    const wrapper = mount(CreditRoundCard, {
      props: { round: makeRound({ restricted: true }) }
    })

    expect(wrapper.find('[data-test="round-cta-lend"]').exists()).toBe(true)
  })

  it('shows a fractional raised amount precisely instead of rounding it down to 0', () => {
    const wrapper = mount(CreditRoundCard, { props: { round: makeRound({ raised: 0.1 }) } })

    // 0.1 raised of a 2 target is genuinely 5% — but rounding "raised" to 0 decimals
    // made it read as "0 USDC of 2 USDC · 5%", which looks self-contradictory.
    expect(wrapper.text()).toContain('0.1 USDC')
    expect(wrapper.text()).toContain('of 2 USDC')
    expect(wrapper.text()).not.toContain('0 USDC of')
  })

  it("uses the round's actual token instead of hardcoding USDC", () => {
    const wrapper = mount(CreditRoundCard, {
      props: { round: makeRound({ token: 'USDT', raised: 500, target: 1000 }) }
    })

    expect(wrapper.text()).toContain('500 USDT')
    expect(wrapper.text()).toContain('of 1,000 USDT')
    expect(wrapper.text()).not.toContain('USDC')
  })

  it('shows the correct fractional remaining amount in the progress note', () => {
    const wrapper = mount(CreditRoundCard, {
      props: { round: makeRound({ raised: 0.1, target: 2 }) }
    })

    expect(wrapper.text()).toContain('1.9 USDC to go')
  })

  it('shows stalled, refunded, partial-funded and target-reached progress notes', () => {
    expect(
      mount(CreditRoundCard, {
        props: { round: makeRound({ status: 'stalled', raised: 0.5, target: 2 }) }
      }).text()
    ).toContain('1.5 USDC short · deadline passed')

    expect(
      mount(CreditRoundCard, {
        props: { round: makeRound({ status: 'refunded', fundable: false }) }
      }).text()
    ).toContain('Refunded — principal returned to lenders')

    expect(
      mount(CreditRoundCard, {
        props: { round: makeRound({ status: 'funded', fundable: false, raised: 1, target: 2 }) }
      }).text()
    ).toContain('Accepted with partial funding · matures Aug 2')

    expect(
      mount(CreditRoundCard, {
        props: { round: makeRound({ status: 'funded', fundable: false, raised: 2, target: 2 }) }
      }).text()
    ).toContain('Target reached · matures Aug 2')
  })

  it('shows extra lender count after the first three avatars', () => {
    const lenders = Array.from({ length: 5 }, (_, index) => ({
      name: `Lender ${index}`,
      addr: `0x${index}`,
      gradient: '#00bf7a,#00b8d9',
      amount: 1,
      expected: 1.1,
      paid: 0,
      date: ''
    }))

    const wrapper = mount(CreditRoundCard, {
      props: { round: makeRound({ lenders }) }
    })

    expect(wrapper.text()).toContain('+2')
    expect(wrapper.text()).toContain('5 lenders')
  })

  it('emits open from the title and manage action for an owner', async () => {
    store.isOwner = true
    const wrapper = mount(CreditRoundCard, { props: { round: makeRound() } })

    await wrapper.find('[data-test="credit-round-card"] > div').trigger('click')
    await wrapper.find('[data-test="round-cta-open"]').trigger('click')

    expect(wrapper.emitted('open')).toHaveLength(2)
    expect(wrapper.find('[data-test="round-cta-lend"]').exists()).toBe(true)
  })

  it('emits lend, repay and view actions from their CTAs', async () => {
    const lendable = mount(CreditRoundCard, { props: { round: makeRound() } })
    await lendable.find('[data-test="round-cta-lend"]').trigger('click')
    expect(lendable.emitted('lend')).toHaveLength(1)

    store.isOwner = true
    const repayable = mount(CreditRoundCard, {
      props: { round: makeRound({ status: 'active', fundable: false }) }
    })
    await repayable.find('[data-test="round-cta-repay"]').trigger('click')
    expect(repayable.emitted('repay')).toHaveLength(1)

    store.isOwner = false
    const viewOnly = mount(CreditRoundCard, {
      props: { round: makeRound({ status: 'active', fundable: false }) }
    })
    await viewOnly.find('[data-test="round-cta-open"]').trigger('click')
    expect(viewOnly.emitted('open')).toHaveLength(1)
  })
})
