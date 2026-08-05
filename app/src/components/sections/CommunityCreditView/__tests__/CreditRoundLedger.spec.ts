import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import type { CreditRound } from '@/types'
import { MINUTES_PER_DAY } from '@/utils'
import CreditRoundLedger from '../CreditRoundLedger.vue'

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
    restricted: false,
    cap: null,
    desc: 'Working capital.',
    lenders: [
      {
        name: 'Alice',
        addr: '0xalice',
        gradient: '#00bf7a,#00b8d9',
        amount: 100,
        expected: 110,
        paid: 25,
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

const UTableStub = defineComponent({
  name: 'UTable',
  props: ['data', 'columns'],
  setup(props, { slots }) {
    return () => {
      const rows = props.data as Array<Record<string, unknown>>
      if (!rows.length) return h('div', { 'data-test': 'u-table-empty' }, slots.empty?.())

      return h(
        'div',
        { 'data-test': 'u-table' },
        rows.map((original, rowIndex) =>
          h(
            'div',
            { 'data-test': 'u-table-row', key: rowIndex },
            props.columns.flatMap((column: { accessorKey: string }) => {
              const slot = slots[`${column.accessorKey}-cell`]
              return slot ? slot({ row: { original } }) : String(original[column.accessorKey] ?? '')
            })
          )
        )
      )
    }
  }
})

function mountLedger(round: CreditRound) {
  return mount(CreditRoundLedger, {
    props: { round },
    global: {
      stubs: {
        UBadge: UBadgeStub,
        UProgress: UProgressStub,
        UTable: UTableStub
      }
    }
  })
}

describe('CreditRoundLedger', () => {
  it('renders funding progress, lender table values and child cards', () => {
    const wrapper = mountLedger(makeRound())

    expect(wrapper.text()).toContain('400 USDC')
    expect(wrapper.text()).toContain('of 1,000 USDC target')
    expect(wrapper.text()).toContain('600 USDC remaining')
    expect(wrapper.text()).toContain('Subscription closes Jun 28')
    expect(wrapper.text()).toContain('Alice')
    expect(wrapper.text()).toContain('You')
    expect(wrapper.text()).toContain('100 USDC')
    expect(wrapper.text()).toContain('110 USDC')
    expect(wrapper.text()).toContain('25 USDC')
    expect(wrapper.text()).toContain('25%')
  })

  it('renders refunded and empty lender states', () => {
    const wrapper = mountLedger(
      makeRound({ status: 'refunded', fundable: false, raised: 0, lenders: [] })
    )

    expect(wrapper.text()).toContain('Refunded — principal returned to lenders')
    expect(wrapper.text()).toContain('No lenders yet')
    expect(wrapper.text()).toContain('Be the first to back this round.')
  })

  it('shows partial-funded and fully-funded notes after the lending window closes', () => {
    const partial = mountLedger(
      makeRound({ status: 'funded', fundable: false, target: 1000, raised: 400 })
    )
    expect(partial.text()).toContain('Accepted with partial funding')

    const fullyFunded = mountLedger(
      makeRound({ status: 'funded', fundable: false, target: 1000, raised: 1000 })
    )
    expect(fullyFunded.text()).toContain('Fully funded')
  })

  it('renders date fallbacks and refunded lender rows', () => {
    const wrapper = mountLedger(
      makeRound({
        deadline: '',
        maturity: '',
        lenders: [
          {
            name: 'Bob',
            addr: '0xbob',
            gradient: '#0057ff,#00bf7a',
            amount: 400,
            expected: 440,
            paid: 0,
            date: '',
            refunded: true,
            you: false
          }
        ]
      })
    )

    expect(wrapper.text()).toContain('Subscription closes —')
    expect(wrapper.text()).toContain('Matures — · 90 days')
    expect(wrapper.text()).toContain('Bob')
    expect(wrapper.text()).toContain('400 USDC')
    expect(wrapper.text()).not.toContain('You')
  })
})
