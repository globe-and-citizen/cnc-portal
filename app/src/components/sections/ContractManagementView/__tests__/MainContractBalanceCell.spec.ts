import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import type { Component } from 'vue'
import MainContractBalanceCell from '../MainContractBalanceCell.vue'
import { makeTokenBalance, mockUseContractBalance } from '@/tests/mocks'

const ADDRESS = '0x0000000000000000000000000000000000000001'

const TooltipStub = {
  name: 'UTooltip',
  props: ['text'],
  template:
    '<div data-test="tooltip"><slot /><div data-test="tooltip-content">{{ text }}<slot name="content" /></div></div>'
}

const PopoverStub = {
  name: 'UPopover',
  props: ['mode', 'openDelay', 'closeDelay'],
  template: '<div data-test="popover"><slot /><slot name="content" /></div>'
}

function mountComponent() {
  return mount(MainContractBalanceCell, {
    props: { address: ADDRESS },
    global: {
      stubs: {
        UTooltip: TooltipStub as Component,
        Tooltip: TooltipStub as Component,
        UPopover: PopoverStub as Component,
        Popover: PopoverStub as Component,
        USkeleton: { template: '<span data-test="skeleton" />' }
      }
    }
  })
}

describe('MainContractBalanceCell', () => {
  beforeEach(() => {
    mockUseContractBalance.isLoading.value = false
    mockUseContractBalance.error.value = null
    mockUseContractBalance.hasData.value = true
  })

  it('[AC-US-CONTRACT-001-09] presents balance loading without claiming zero', () => {
    mockUseContractBalance.isLoading.value = true
    mockUseContractBalance.hasData.value = false

    const wrapper = mountComponent()

    expect(wrapper.find('[data-test="contract-balance-loading"]').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('$0')
  })

  it('[AC-US-CONTRACT-001-09] presents an unavailable balance separately from zero', () => {
    mockUseContractBalance.hasData.value = false

    const wrapper = mountComponent()

    expect(wrapper.find('[data-test="contract-balance-empty"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('No balance data is available')
  })

  it('[AC-US-CONTRACT-001-09] presents a confirmed zero balance', () => {
    mockUseContractBalance.balances.value = [makeTokenBalance({ amount: 0 })]
    mockUseContractBalance.total.value = {
      usd: { value: 0, formatted: '$0' },
      local: { value: 0, formatted: '$0' }
    }

    const wrapper = mountComponent()

    expect(wrapper.find('[data-test="contract-balance-zero"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('$0')
  })

  it('[AC-US-CONTRACT-001-09] presents a failed balance read instead of zero', () => {
    mockUseContractBalance.error.value = new Error('RPC unavailable')
    mockUseContractBalance.hasData.value = false

    const wrapper = mountComponent()

    expect(wrapper.find('[data-test="contract-balance-error"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Unavailable')
    expect(wrapper.text()).not.toContain('$0')
  })

  it('[AC-US-CONTRACT-001-09] presents aggregate value and supported-asset balances', () => {
    mockUseContractBalance.balances.value = [
      makeTokenBalance({
        amount: 12.5,
        usdPrice: 1,
        localPrice: 1
      })
    ]
    mockUseContractBalance.total.value = {
      usd: { value: 12.5, formatted: '$12.50' },
      local: { value: 12.5, formatted: '$12.50' }
    }

    const wrapper = mountComponent()

    expect(wrapper.findComponent({ name: 'UPopover' }).props('mode')).toBe('hover')
    expect(wrapper.find('[data-test="contract-balance-value"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="contract-balance-details"]').text()).toContain(
      'Balance breakdown'
    )
    expect(wrapper.find('[data-test="contract-balance-details"]').text()).toContain('12.5')
    expect(wrapper.find('[data-test="contract-balance-details"]').text()).toContain('$12.50')
  })
})
