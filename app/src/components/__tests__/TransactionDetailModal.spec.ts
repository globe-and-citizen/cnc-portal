import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import type { TransactionHistoryItemRow } from '@/types/transaction-history'

vi.mock('@nuxt/ui/components/Badge.vue', () => ({
  default: {
    name: 'UBadge',
    props: ['color', 'variant'],
    template: '<span data-test="u-badge"><slot /></span>'
  }
}))

vi.mock('@nuxt/ui/components/Divider.vue', () => ({
  default: {
    name: 'UDivider',
    template: '<hr data-test="u-divider" />'
  }
}))

vi.mock('@nuxt/ui/components/Slideover.vue', () => ({
  default: {
    name: 'USlideover',
    props: ['open', 'title'],
    template: '<div data-test="u-slideover"><slot name="body" /><slot name="footer" /></div>'
  }
}))

vi.mock('@nuxt/ui/components/Card.vue', () => ({
  default: {
    name: 'UCard',
    template: '<div data-test="u-card"><slot /></div>'
  }
}))

import TransactionDetailModal from '../TransactionDetailModal.vue'

const AddressToolTipStub = defineComponent({
  name: 'AddressToolTip',
  props: {
    address: { type: String, required: true },
    slice: { type: Boolean, required: false },
    type: { type: String, required: false }
  },
  template: '<span data-test="address-tooltip">{{ address }}</span>'
})

const UserComponentStub = defineComponent({
  name: 'UserComponent',
  props: {
    user: { type: Object, required: false }
  },
  template: '<span data-test="user-component-stub">{{ user?.address }}</span>'
})

const BASE_TRANSACTION: TransactionHistoryItemRow = {
  txHash: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  date: '2026-01-10T10:00:00.000Z',
  from: '0x1111111111111111111111111111111111111111',
  to: '0x2222222222222222222222222222222222222222',
  amount: '10',
  amountUSD: 0,
  amountLocal: 1250,
  tokenAddress: '0x3333333333333333333333333333333333333333',
  token: 'USDC',
  type: 'transfer'
}

const mountComponent = (overrides: Partial<TransactionHistoryItemRow> = {}, open = true) =>
  mount(TransactionDetailModal, {
    props: {
      transaction: { ...BASE_TRANSACTION, ...overrides },
      open
    },
    global: {
      stubs: {
        AddressToolTip: AddressToolTipStub,
        UserComponent: UserComponentStub
      }
    }
  })

describe('TransactionDetailModal', () => {
  it('displays the friendly type label in the event badge', () => {
    const wrapper = mountComponent({ type: 'tokenTransfer' })

    expect(wrapper.text()).toContain('Token transfer')
    expect(wrapper.text()).not.toContain('tokenTransfer')
  })

  it('shows Token row and Amount row when event has a token', () => {
    const wrapper = mountComponent({ type: 'tokenTransfer', token: 'USDC', amount: '25' })

    expect(wrapper.text()).toContain('Token')
    expect(wrapper.text()).toContain('USDC')
    expect(wrapper.text()).toContain('Amount')
  })

  it('shows From/To user components when event has no token', () => {
    const wrapper = mountComponent({
      type: 'approvalActivated',
      token: '-',
      amount: '0'
    })

    const userStubs = wrapper.findAll('[data-test="user-component-stub"]')
    expect(userStubs.length).toBeGreaterThanOrEqual(1)
  })

  it('hides Amount row when amount is zero', () => {
    const wrapper = mountComponent({ type: 'safeDepositsEnabled', token: '-', amount: '0' })

    expect(wrapper.text()).not.toContain('Amount')
  })

  it('shows Amount row when token is dash but amount is positive', () => {
    const wrapper = mountComponent({ type: 'safeMultiplierUpdated', token: '-', amount: '2.5' })

    expect(wrapper.text()).toContain('Amount')
  })

  it('shows summary section when transaction has a summary', () => {
    const wrapper = mountComponent({ type: 'tokenDeposit', amount: '10', token: 'USDC' })

    expect(wrapper.text()).toContain('Summary')
    expect(wrapper.text()).toContain('Token deposit')
  })

  it('does not show To row for tokenSupportAdded when to equals tokenAddress', () => {
    const tokenAddr = '0x3333333333333333333333333333333333333333'
    const wrapper = mountComponent({
      type: 'tokenSupportAdded',
      token: 'USDC',
      tokenAddress: tokenAddr,
      to: tokenAddr,
      amount: '0'
    })

    expect(wrapper.text()).toContain('Token')
    // address should appear only once (in Token row), not twice (which would indicate a To row)
    const addressOccurrences = (wrapper.text().match(new RegExp(tokenAddr.slice(0, 10), 'g')) ?? [])
      .length
    expect(addressOccurrences).toBe(1)
  })

  it('shows friendly label for config events like safeDepositsEnabled', () => {
    const wrapper = mountComponent({ type: 'safeDepositsEnabled', token: '-', amount: '0' })

    expect(wrapper.text()).toContain('Safe deposits enabled')
    expect(wrapper.text()).not.toContain('safeDepositsEnabled')
  })

  it('shows the tx hash in the transaction section', () => {
    const wrapper = mountComponent()

    expect(wrapper.text()).toContain('Tx hash')
    expect(wrapper.text()).toContain(BASE_TRANSACTION.txHash)
  })

  it('shows the timestamp in the transaction section', () => {
    const wrapper = mountComponent()

    expect(wrapper.text()).toContain('Timestamp')
  })
})
