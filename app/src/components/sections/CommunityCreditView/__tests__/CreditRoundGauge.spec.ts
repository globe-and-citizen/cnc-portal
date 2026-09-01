import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import type { CreditRound } from '@/types'
import { MINUTES_PER_DAY } from '@/utils/communityCredit/model'
import CreditRoundGauge from '../CreditRoundGauge.vue'

function makeRound(overrides: Partial<CreditRound> = {}): CreditRound {
  return {
    id: '1',
    name: 'Q3 runway bridge',
    token: 'USDC',
    target: 1000,
    raised: 250,
    totalRepaid: 100,
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
    lenders: [
      {
        name: 'Alice',
        addr: '0xalice',
        gradient: '#00bf7a,#00b8d9',
        amount: 250,
        expected: 275,
        paid: 100,
        date: '',
        you: true
      }
    ],
    ...overrides
  }
}

const UBadgeStub = defineComponent({
  name: 'UBadge',
  props: ['label'],
  setup(props) {
    return () => h('span', props.label)
  }
})

const UProgressStub = defineComponent({
  name: 'UProgress',
  props: ['modelValue'],
  setup(props) {
    return () => h('div', { 'data-test': 'u-progress', 'data-value': props.modelValue })
  }
})

function mountGauge(round: CreditRound) {
  return mount(CreditRoundGauge, {
    props: { round },
    global: {
      stubs: {
        UBadge: UBadgeStub,
        UProgress: UProgressStub
      }
    }
  })
}

describe('CreditRoundGauge', () => {
  it('renders funding, repayment, access and lender details for an open restricted round', () => {
    const wrapper = mountGauge(makeRound())

    expect(wrapper.text()).toContain('25%')
    expect(wrapper.text()).toContain('250 USDC')
    expect(wrapper.text()).toContain('750 USDC remaining')
    expect(wrapper.text()).toContain('100 USDC')
    expect(wrapper.text()).toContain('repaid of 275 USDC')
    expect(wrapper.text()).toContain('Interest due')
    expect(wrapper.text()).toContain('Restricted round')
    expect(wrapper.text()).toContain('Only whitelisted members can lend · capped at 500 USDC each')
    expect(wrapper.text()).toContain('Alice')
    expect(wrapper.text()).toContain('100%')
  })

  it('shows refunded state and empty lender copy', () => {
    const wrapper = mountGauge(
      makeRound({
        status: 'refunded',
        fundable: false,
        raised: 0,
        totalRepaid: 0,
        restricted: false,
        cap: null,
        lenders: []
      })
    )

    expect(wrapper.text()).toContain('Refunded — principal returned to lenders')
    expect(wrapper.text()).toContain('Open to all members')
    expect(wrapper.text()).toContain('Any member can lend any amount')
    expect(wrapper.text()).toContain('No lenders yet.')
  })

  it('distinguishes partial funding from fully funded rounds', () => {
    const partial = mountGauge(
      makeRound({ status: 'funded', fundable: false, target: 1000, raised: 400 })
    )
    expect(partial.text()).toContain('Accepted with partial funding')

    const fullyFunded = mountGauge(
      makeRound({ status: 'funded', fundable: false, target: 1000, raised: 1000 })
    )
    expect(fullyFunded.text()).toContain('Fully funded')
  })

  it('renders fully repaid and refunded-lender states without remaining repayment copy', () => {
    const wrapper = mountGauge(
      makeRound({
        raised: 1000,
        totalRepaid: 1100,
        status: 'repaid',
        fundable: false,
        deadline: '',
        maturity: '',
        lenders: [
          {
            name: 'Bob',
            addr: '0xbob',
            gradient: '#0057ff,#00bf7a',
            amount: 1000,
            expected: 1100,
            paid: 1100,
            date: '',
            refunded: true,
            you: false
          }
        ]
      })
    )

    expect(wrapper.text()).toContain('repaid of 1,100 USDC')
    expect(wrapper.text()).toContain('Refunded')
    expect(wrapper.text()).toContain('matures —')
    expect(wrapper.text()).toContain('Closes')
    expect(wrapper.text()).not.toContain('0 USDC remaining')
  })
})
