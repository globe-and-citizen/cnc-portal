import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import BankBalanceSection from '../BankBalanceSection.vue'
import { NETWORK } from '@/constant'
import type { Address } from 'viem'

describe('BankBalanceSection', () => {
  const defaultProps = {
    teamBalance: { formatted: '1.5' },
    usdcBalance: BigInt(1500000), // 1.5 USDC
    balanceLoading: false,
    isLoadingUsdcBalance: false,
    bankAddress: '0x123' as Address
  }

  it('displays correct ETH balance', () => {
    const wrapper = mount(BankBalanceSection, {
      props: defaultProps,
      global: {
        stubs: {
          ButtonUI: false,
          PlusIcon: true,
          ArrowsRightLeftIcon: true
        }
      }
    })

    const balanceText = wrapper.find('.text-4xl').text()
    expect(balanceText).toContain('1.5')
    expect(wrapper.find('.text-gray-600').text()).toContain(NETWORK.currencySymbol)
  })

  it('displays correct USDC balance', () => {
    const wrapper = mount(BankBalanceSection, {
      props: defaultProps,
      global: {
        stubs: {
          ButtonUI: false,
          PlusIcon: true,
          ArrowsRightLeftIcon: true
        }
      }
    })

    const usdcText = wrapper.find('.mt-2').text()
    expect(usdcText).toContain('1.5') // 1500000 / 1e6 = 1.5
  })

  it('displays loading state when fetching balances', () => {
    const wrapper = mount(BankBalanceSection, {
      props: {
        ...defaultProps,
        balanceLoading: true
      },
      global: {
        stubs: {
          ButtonUI: false,
          PlusIcon: true,
          ArrowsRightLeftIcon: true
        }
      }
    })

    const loadingSpinner = wrapper.find('.loading-spinner')
    expect(loadingSpinner.exists()).toBe(true)
  })

  it('enables deposit button when bank address exists', () => {
    const wrapper = mount(BankBalanceSection, {
      props: defaultProps,
      global: {
        stubs: {
          ButtonUI: false,
          PlusIcon: true,
          ArrowsRightLeftIcon: true
        }
      }
    })

    const depositButton = wrapper.find('[data-test="deposit-button"]')
    expect(depositButton.attributes('disabled')).toBeFalsy()
  })

  it('enables transfer button when bank address exists', () => {
    const wrapper = mount(BankBalanceSection, {
      props: defaultProps,
      global: {
        stubs: {
          ButtonUI: false,
          PlusIcon: true,
          ArrowsRightLeftIcon: true
        }
      }
    })

    const transferButton = wrapper.find('[data-test="transfer-button"]')
    expect(transferButton.attributes('disabled')).toBeFalsy()
  })

  it('emits open-deposit event on deposit button click', async () => {
    const wrapper = mount(BankBalanceSection, {
      props: defaultProps,
      global: {
        stubs: {
          ButtonUI: false,
          PlusIcon: true,
          ArrowsRightLeftIcon: true
        }
      }
    })

    const depositButton = wrapper.find('[data-test="deposit-button"]')
    await depositButton.trigger('click')
    expect(wrapper.emitted('open-deposit')).toBeTruthy()
  })

  it('emits open-transfer event on transfer button click', async () => {
    const wrapper = mount(BankBalanceSection, {
      props: defaultProps,
      global: {
        stubs: {
          ButtonUI: false,
          PlusIcon: true,
          ArrowsRightLeftIcon: true
        }
      }
    })

    const transferButton = wrapper.find('[data-test="transfer-button"]')
    await transferButton.trigger('click')
    expect(wrapper.emitted('open-transfer')).toBeTruthy()
  })
})
