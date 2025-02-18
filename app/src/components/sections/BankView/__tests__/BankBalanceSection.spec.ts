import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import BankBalanceSection from '../BankBalanceSection.vue'
import { NETWORK } from '@/constant'
import type { Address } from 'viem'
import { createTestingPinia } from '@pinia/testing'
import { ref } from 'vue'
import { createConfig, http } from '@wagmi/core'
import { mainnet } from '@wagmi/core/chains'
import type * as wagmiVue from '@wagmi/vue'

// Create a test wagmi config
const config = createConfig({
  chains: [mainnet],
  transports: {
    [mainnet.id]: http()
  }
})

// Mock the useConfig composable
vi.mock('@wagmi/vue', async (importOriginal) => {
  const actual = (await importOriginal()) as typeof wagmiVue
  return {
    ...actual,
    useConfig: () => config,
    useBalance: () => ({
      data: ref({ formatted: '1.5', value: BigInt(1500000) }),
      isLoading: ref(false),
      error: ref(null),
      refetch: vi.fn()
    }),
    useReadContract: () => ({
      data: ref(BigInt(1500000)),
      isLoading: ref(false),
      error: ref(null),
      refetch: vi.fn()
    }),
    useChainId: () => ref(1)
  }
})

describe('BankBalanceSection', () => {
  const defaultProps = {
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
        },
        plugins: [createTestingPinia({ createSpy: vi.fn })]
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
        },
        plugins: [createTestingPinia({ createSpy: vi.fn })]
      }
    })

    const usdcText = wrapper.find('.mt-2').text()
    expect(usdcText).toContain('1.5') // 1500000 / 1e6 = 1.5
  })

  it('enables deposit button when bank address exists', () => {
    const wrapper = mount(BankBalanceSection, {
      props: defaultProps,
      global: {
        stubs: {
          ButtonUI: false,
          PlusIcon: true,
          ArrowsRightLeftIcon: true
        },
        plugins: [createTestingPinia({ createSpy: vi.fn })]
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
        },
        plugins: [createTestingPinia({ createSpy: vi.fn })]
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
        },
        plugins: [createTestingPinia({ createSpy: vi.fn })]
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
        },
        plugins: [createTestingPinia({ createSpy: vi.fn })]
      }
    })

    const transferButton = wrapper.find('[data-test="transfer-button"]')
    await transferButton.trigger('click')
    expect(wrapper.emitted('open-transfer')).toBeTruthy()
  })
})
