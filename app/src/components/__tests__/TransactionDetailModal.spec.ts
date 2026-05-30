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
  it('renders transfer details with from/to and amount sections', () => {
    const wrapper = mountComponent({ type: 'tokenTransfer', amount: '25', token: 'USDC' })

    expect(wrapper.text()).toContain('tokenTransfer')
    expect(wrapper.text()).toContain('Tx Hash')
    expect(wrapper.text()).toContain('From')
    expect(wrapper.text()).toContain('To')
    expect(wrapper.text()).toContain('Amount')
    expect(wrapper.text()).toContain('USDC')
    expect(wrapper.findAll('.text-right > div')).toHaveLength(2)
  })

  it('renders hash-status transactions with status badge content', () => {
    const wrapper = mountComponent({ type: 'approvalActivated' })

    expect(wrapper.text()).toContain('Contract')
    expect(wrapper.text()).toContain('Signature Hash')
    expect(wrapper.text()).toContain('Status')
    expect(wrapper.text()).toContain('Activated')
  })

  it('maps all hash-status labels', async () => {
    const wrapper = mountComponent({ type: 'approvalDeactivated' })
    expect(wrapper.text()).toContain('Deactivated')

    await wrapper.setProps({
      transaction: {
        ...BASE_TRANSACTION,
        type: 'wageClaimEnabled'
      }
    })
    expect(wrapper.text()).toContain('Enabled')

    await wrapper.setProps({
      transaction: {
        ...BASE_TRANSACTION,
        type: 'wageClaimDisabled'
      }
    })
    expect(wrapper.text()).toContain('Disabled')
  })

  it('renders token support details for add and remove actions', async () => {
    const wrapper = mountComponent({ type: 'tokenSupportAdded' })

    expect(wrapper.text()).toContain('Token')
    expect(wrapper.text()).toContain('Action')
    expect(wrapper.text()).toContain('Added')

    await wrapper.setProps({
      transaction: {
        ...BASE_TRANSACTION,
        type: 'tokenSupportRemoved'
      }
    })

    expect(wrapper.text()).toContain('Removed')
  })

  it('renders safe deposit enabled/disabled details', async () => {
    const wrapper = mountComponent({ type: 'safeDepositsEnabled' })

    expect(wrapper.text()).toContain('Action')
    expect(wrapper.text()).toContain('Enabled')
    expect(wrapper.text()).toContain('By')
    expect(wrapper.text()).toContain('Contract')

    await wrapper.setProps({
      transaction: {
        ...BASE_TRANSACTION,
        type: 'safeDepositsDisabled'
      }
    })

    expect(wrapper.text()).toContain('Disabled')
  })

  it('renders safe address update details', () => {
    const wrapper = mountComponent({ type: 'safeAddressUpdated' })

    expect(wrapper.text()).toContain('Old Safe')
    expect(wrapper.text()).toContain('New Safe')
  })

  it('renders safe multiplier update details', () => {
    const wrapper = mountComponent({ type: 'safeMultiplierUpdated', amount: '2.5', token: 'x' })

    expect(wrapper.text()).toContain('New Multiplier')
    expect(wrapper.text()).toContain('2.5x')
    expect(wrapper.text()).toContain('Contract')
  })

  it('renders officer address update details via config fallback branch', () => {
    const wrapper = mountComponent({ type: 'officerAddressUpdated' })

    expect(wrapper.text()).toContain('New Address')
  })

  it('renders token address change details', () => {
    const wrapper = mountComponent({ type: 'tokenAddressChanged' })

    expect(wrapper.text()).toContain('Old Address')
    expect(wrapper.text()).toContain('New Address')
  })

  it('renders generic fallback from/to for unknown types', () => {
    const wrapper = mountComponent({ type: 'unknownType' })

    expect(wrapper.text()).toContain('From')
    expect(wrapper.text()).toContain('To')
  })

  it('emits update:open when modal close is triggered', async () => {
    const wrapper = mountComponent({ type: 'transfer' }, true)

    await wrapper.get('[data-test="close-wage-modal-button"]').trigger('click')

    expect(wrapper.emitted('update:open')).toEqual([[false]])
  })
})
