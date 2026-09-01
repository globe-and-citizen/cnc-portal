import { describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import type { CreditRound } from '@/types'
import { MINUTES_PER_DAY } from '@/utils'
import CreditRepayPanel from '../CreditRepayPanel.vue'
import type { RepaymentPanelState } from '../CreditRepayPanel.vue'
import type { RepayBreakdownRow } from '../CreditRepayBreakdownTable.vue'

function sampleRound(over: Partial<CreditRound> = {}): CreditRound {
  return {
    id: '1',
    name: 'Q3 runway bridge',
    token: 'USDC',
    target: 40000,
    raised: 23400,
    totalRepaid: 0,
    rate: 5,
    period: 90 * MINUTES_PER_DAY,
    termLabel: '90 days',
    status: 'active',
    fundable: false,
    opened: 'Jun 1',
    deadline: 'Jun 28',
    maturity: 'Oct 26',
    restricted: false,
    cap: null,
    desc: 'Working capital.',
    lenders: [],
    ...over
  }
}

function sampleRows(): RepayBreakdownRow[] {
  return [
    {
      name: 'Alice',
      addr: '0x0000...00a1',
      gradient: '#000000,#ffffff',
      amount: 5000,
      expected: 5250,
      paid: 0,
      date: '',
      you: false,
      interest: 250,
      total: 5250,
      remaining: 5250
    }
  ]
}

interface PanelProps {
  round: CreditRound
  rows: RepayBreakdownRow[]
  isOwner: boolean
  repayment: RepaymentPanelState
}

function repaymentState(overrides: Partial<RepaymentPanelState> = {}): RepaymentPanelState {
  return {
    outstanding: 5250,
    treasuryBalance: 10000,
    isReady: true,
    isRepayable: true,
    canRepayViaBank: true,
    isSubmitting: false,
    errorMessage: null,
    ...overrides
  }
}

function panelProps(overrides: Partial<PanelProps> = {}): PanelProps {
  return {
    round: sampleRound(),
    rows: sampleRows(),
    isOwner: true,
    repayment: repaymentState(),
    ...overrides
  }
}

describe('CreditRepayPanel', () => {
  it('emits the prefilled full repayment amount when the issuer confirms', async () => {
    const wrapper = mount(CreditRepayPanel, { props: panelProps() })
    await flushPromises()

    await wrapper.find('[data-test="confirm-repay"]').trigger('click')

    expect(wrapper.emitted('repay')).toEqual([['5250']])
  })

  it("shows each lender's paid-so-far share in the breakdown table", async () => {
    const wrapper = mount(CreditRepayPanel, {
      props: panelProps({
        rows: [
          {
            ...sampleRows()[0],
            paid: 1000,
            remaining: 4250
          }
        ],
        repayment: repaymentState({ outstanding: 4250 })
      })
    })
    await flushPromises()

    expect(wrapper.text()).toContain('Paid so far')
    expect(wrapper.text()).toContain('1,000 USDC')
  })

  it('grays out and disables Repay once nothing is left outstanding', async () => {
    const wrapper = mount(CreditRepayPanel, {
      props: panelProps({
        repayment: repaymentState({ outstanding: 0 }),
        rows: [
          {
            ...sampleRows()[0],
            paid: 5250,
            remaining: 0
          }
        ]
      })
    })
    await flushPromises()

    const button = wrapper.findComponent('[data-test="confirm-repay"]')
    expect(button.props('disabled')).toBe(true)
    expect(button.props('color')).toBe('neutral')
  })

  it('renders the submission error supplied by the owning view', () => {
    const wrapper = mount(CreditRepayPanel, {
      props: panelProps({ repayment: repaymentState({ errorMessage: 'Transaction failed' }) })
    })

    expect(wrapper.find('[data-test="repay-error"]').text()).toContain('Transaction failed')
  })

  it('disables Repay and explains why when the connected wallet is not the Bank owner', async () => {
    const wrapper = mount(CreditRepayPanel, {
      props: panelProps({ repayment: repaymentState({ canRepayViaBank: false }) })
    })
    await flushPromises()

    expect(wrapper.find('[data-test="repay-bank-blocked"]').exists()).toBe(true)
    expect(wrapper.findComponent('[data-test="confirm-repay"]').props('disabled')).toBe(true)

    await wrapper.find('[data-test="confirm-repay"]').trigger('click')
    expect(wrapper.emitted('repay')).toBeUndefined()
  })

  it('disables Repay and explains why on a round still open for funding', async () => {
    const wrapper = mount(CreditRepayPanel, {
      props: panelProps({
        round: sampleRound({ status: 'open' }),
        repayment: repaymentState({ isRepayable: false })
      })
    })
    await flushPromises()

    expect(wrapper.find('[data-test="repay-not-funded"]').exists()).toBe(true)
    expect(wrapper.findComponent('[data-test="confirm-repay"]').props('disabled')).toBe(true)
  })

  it.each(['stalled', 'refunded', 'repaid'] as const)(
    'disables Repay without the not-yet-funded message on a %s round',
    async (status) => {
      const wrapper = mount(CreditRepayPanel, {
        props: panelProps({
          round: sampleRound({ status }),
          repayment: repaymentState({ isRepayable: false })
        })
      })
      await flushPromises()

      expect(wrapper.find('[data-test="repay-not-funded"]').exists()).toBe(false)
      expect(wrapper.findComponent('[data-test="confirm-repay"]').props('disabled')).toBe(true)
    }
  )

  it('keeps repayment disabled while the exact treasury balance is loading', async () => {
    const wrapper = mount(CreditRepayPanel, {
      props: panelProps({
        repayment: repaymentState({
          outstanding: null,
          treasuryBalance: null,
          isReady: false
        })
      })
    })
    await flushPromises()

    expect(wrapper.find('[data-test="repay-details-loading"]').exists()).toBe(true)
    expect(wrapper.findComponent('[data-test="confirm-repay"]').props('disabled')).toBe(true)
  })

  it('shows only the breakdown table for a non-owner, with no repayment form', () => {
    const wrapper = mount(CreditRepayPanel, {
      props: panelProps({ isOwner: false })
    })

    expect(wrapper.text()).toContain('Repayment breakdown')
    expect(wrapper.find('[data-test="confirm-repay"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('Outstanding')
  })

  it('emits cancel instead of routing directly', async () => {
    const wrapper = mount(CreditRepayPanel, { props: panelProps() })

    await wrapper.get('[data-test="cancel-repay"]').trigger('click')

    expect(wrapper.emitted('cancel')).toEqual([[]])
  })
})
