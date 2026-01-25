import { flushPromises, mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { nextTick } from 'vue'
import CRAddERC20Support from '../CRAddERC20Support.vue'
import ButtonUI from '@/components/ButtonUI.vue'
import SelectComponent from '@/components/SelectComponent.vue'
import AddressToolTip from '@/components/AddressToolTip.vue'
import { zeroAddress } from 'viem'
// Mock constants
vi.mock('@/constant', () => ({
  USDC_ADDRESS: '0xA0b86a33E6441bB7bE6d0B9EB5Bbf26b2d60C1cd'
}))

const USDC_ADDRESS = '0xA0b86a33E6441bB7bE6d0B9EB5Bbf26b2d60C1cd'

// Hoisted variables for mocks
const { mockReadContract, mockWriteContract, mockUseDebounceFn, mockTeamStore, mockToastStore } =
  vi.hoisted(() => ({
    mockReadContract: vi.fn(),
    mockWriteContract: vi.fn(),
    mockUseDebounceFn: vi.fn((fn) => fn),
    mockTeamStore: {
      getContractAddressByType: vi.fn((type) => {
        if (type === 'InvestorV1') return '0x1234567890123456789012345678901234567890'
        if (type === 'CashRemunerationEIP712') return '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd'
        return undefined
      })
    },
    mockToastStore: {
      addErrorToast: vi.fn(),
      addSuccessToast: vi.fn()
    }
  }))

// Mock wagmi functions
vi.mock('@wagmi/core', () => ({
  readContract: mockReadContract,
  writeContract: mockWriteContract
}))

// Mock wagmi config
vi.mock('@/wagmi.config', () => ({
  config: {}
}))

// Mock ABI import
vi.mock('@/artifacts/abi/CashRemunerationEIP712.json', () => ({
  default: []
}))

// Mock viem functions
vi.mock('viem', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    isAddress: vi.fn((address: string) => {
      return /^0x[a-fA-F0-9]{40}$/.test(address)
    })
  }
})

// Mock VueUse
vi.mock('@vueuse/core', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    useDebounceFn: mockUseDebounceFn,
    onClickOutside: vi.fn()
  }
})

// Mock stores
vi.mock('@/stores', () => ({
  useTeamStore: vi.fn(() => mockTeamStore),
  useToastStore: vi.fn(() => mockToastStore),
  useUserDataStore: vi.fn(() => ({ address: zeroAddress }))
}))

describe.skip('CRAddERC20Support.vue', () => {
  let wrapper: ReturnType<typeof mount>

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  const mountComponent = () => {
    return mount(CRAddERC20Support, {
      global: {
        components: {
          ButtonUI,
          SelectComponent,
          AddressToolTip
        }
      }
    })
  }

  describe('Component Rendering', () => {
    it('should render the component with all required elements', () => {
      wrapper = mountComponent()

      expect(wrapper.find('[data-test="token-select"]').exists()).toBe(true)
      expect(wrapper.find('[data-test="add-token-button"]').exists()).toBe(true)
    })

    it('should render SelectComponent with correct options', () => {
      wrapper = mountComponent()
      const selectComponent = wrapper.findComponent(SelectComponent)

      expect(selectComponent.exists()).toBe(true)
      expect(selectComponent.props('options')).toEqual([
        { label: 'Investors', value: '0x1234567890123456789012345678901234567890' },
        { label: 'USDC', value: USDC_ADDRESS }
      ])
    })

    it('should not render AddressToolTip when no token is selected', () => {
      wrapper = mountComponent()
      expect(wrapper.findComponent(AddressToolTip).exists()).toBe(false)
    })

    it('should render AddressToolTip when token is selected', async () => {
      wrapper = mountComponent()
      const selectComponent = wrapper.findComponent(SelectComponent)

      // Simulate selecting a token
      await selectComponent.setValue('0x1234567890123456789012345678901234567890')
      await nextTick()

      expect(wrapper.findComponent(AddressToolTip).exists()).toBe(true)
      expect(wrapper.findComponent(AddressToolTip).props('address')).toBe(
        '0x1234567890123456789012345678901234567890'
      )
    })
  })

  describe('Button States and Behavior', () => {
    it('should disable button when no token is selected', () => {
      wrapper = mountComponent()
      const button = wrapper.findComponent(ButtonUI)

      expect(button.props('disabled')).toBe(true)
    })

    it('should show Add Token Support text initially', () => {
      wrapper = mountComponent()
      const button = wrapper.find('[data-test="add-token-button"]')

      expect(button.text()).toBe('Add Token Support')
    })

    it('should have primary variant initially', () => {
      wrapper = mountComponent()
      const button = wrapper.findComponent(ButtonUI)

      expect(button.props('variant')).toBe('primary')
    })

    it('should enable button after selecting valid token and checking support', async () => {
      mockReadContract.mockResolvedValue(false)
      wrapper = mountComponent()
      const selectComponent = wrapper.findComponent(SelectComponent)

      await selectComponent.setValue('0x1234567890123456789012345678901234567890')
      await nextTick()
      await flushPromises()

      const button = wrapper.findComponent(ButtonUI)
      expect(button.props('disabled')).toBe(false)
    })

    it('should show Remove Token Support when token is supported', async () => {
      mockReadContract.mockResolvedValue(true)
      wrapper = mountComponent()
      const selectComponent = wrapper.findComponent(SelectComponent)

      await selectComponent.setValue('0x1234567890123456789012345678901234567890')
      await nextTick()
      await flushPromises()

      const button = wrapper.find('[data-test="add-token-button"]')
      expect(button.text()).toBe('Remove Token Support')

      const buttonComponent = wrapper.findComponent(ButtonUI)
      expect(buttonComponent.props('variant')).toBe('error')
    })
  })

  describe('Token Support Checking', () => {
    it('should check token support when valid token is selected', async () => {
      mockReadContract.mockResolvedValue(false)
      wrapper = mountComponent()
      const selectComponent = wrapper.findComponent(SelectComponent)

      await selectComponent.setValue('0x1234567890123456789012345678901234567890')
      await nextTick()
      await flushPromises()

      expect(mockReadContract).toHaveBeenCalledWith(
        {},
        {
          address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
          abi: [],
          functionName: 'supportedTokens',
          args: ['0x1234567890123456789012345678901234567890']
        }
      )
    })

    it('should not check support for invalid addresses', async () => {
      wrapper = mountComponent()
      const selectComponent = wrapper.findComponent(SelectComponent)

      await selectComponent.setValue('invalid-address')
      await nextTick()
      await flushPromises()

      expect(mockReadContract).not.toHaveBeenCalled()
    })

    it('should handle errors when checking token support', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockReadContract.mockRejectedValue(new Error('Network error'))
      wrapper = mountComponent()
      const selectComponent = wrapper.findComponent(SelectComponent)

      await selectComponent.setValue('0x1234567890123456789012345678901234567890')
      await nextTick()
      await flushPromises()

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error checking token support:',
        expect.any(Error)
      )
      expect(mockToastStore.addErrorToast).toHaveBeenCalledWith(
        'Failed to check token support status'
      )

      consoleErrorSpy.mockRestore()
    })
  })

  describe('Adding/Removing Token Support', () => {
    it('should add token support for unsupported token', async () => {
      mockReadContract.mockResolvedValue(false)
      mockWriteContract.mockResolvedValue({})
      wrapper = mountComponent()
      const selectComponent = wrapper.findComponent(SelectComponent)

      await selectComponent.setValue('0x1234567890123456789012345678901234567890')
      await nextTick()
      await flushPromises()

      const button = wrapper.find('[data-test="add-token-button"]')
      await button.trigger('click')
      await flushPromises()

      expect(mockWriteContract).toHaveBeenCalledWith(
        {},
        {
          address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
          abi: [],
          functionName: 'addTokenSupport',
          args: ['0x1234567890123456789012345678901234567890']
        }
      )

      expect(mockToastStore.addSuccessToast).toHaveBeenCalledWith(
        'Token support added successfully'
      )
    })

    it('should remove token support for supported token', async () => {
      mockReadContract.mockResolvedValue(true)
      mockWriteContract.mockResolvedValue({})
      wrapper = mountComponent()
      const selectComponent = wrapper.findComponent(SelectComponent)

      await selectComponent.setValue('0x1234567890123456789012345678901234567890')
      await nextTick()
      await flushPromises()

      const button = wrapper.find('[data-test="add-token-button"]')
      await button.trigger('click')
      await flushPromises()

      expect(mockWriteContract).toHaveBeenCalledWith(
        {},
        {
          address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
          abi: [],
          functionName: 'removeTokenSupport',
          args: ['0x1234567890123456789012345678901234567890']
        }
      )

      expect(mockToastStore.addSuccessToast).toHaveBeenCalledWith(
        'Token support removed successfully'
      )
    })

    it('should handle errors when adding token support', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockReadContract.mockResolvedValue(false)
      mockWriteContract.mockRejectedValue(new Error('Transaction failed'))
      wrapper = mountComponent()
      const selectComponent = wrapper.findComponent(SelectComponent)

      await selectComponent.setValue('0x1234567890123456789012345678901234567890')
      await nextTick()
      await flushPromises()

      const button = wrapper.find('[data-test="add-token-button"]')
      await button.trigger('click')
      await flushPromises()

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error Updating token support:',
        expect.any(Error)
      )
      expect(mockToastStore.addErrorToast).toHaveBeenCalledWith(
        'Failed to add token support: Transaction failed'
      )

      consoleErrorSpy.mockRestore()
    })

    it('should handle errors when removing token support', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockReadContract.mockResolvedValue(true)
      mockWriteContract.mockRejectedValue(new Error('Transaction failed'))
      wrapper = mountComponent()
      const selectComponent = wrapper.findComponent(SelectComponent)

      await selectComponent.setValue('0x1234567890123456789012345678901234567890')
      await nextTick()
      await flushPromises()

      const button = wrapper.find('[data-test="add-token-button"]')
      await button.trigger('click')
      await flushPromises()

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error Updating token support:',
        expect.any(Error)
      )
      expect(mockToastStore.addErrorToast).toHaveBeenCalledWith(
        'Failed to remove token support: Transaction failed'
      )

      consoleErrorSpy.mockRestore()
    })
  })

  // describe('Loading States', () => {
  //   it('should show loading state on button during transaction', async () => {
  //     let resolveWriteContract: (value: unknown) => void
  //     const writeContractPromise = new Promise((resolve) => {
  //       resolveWriteContract = resolve
  //     })
  //     mockReadContract.mockResolvedValue(false)
  //     mockWriteContract.mockReturnValue(writeContractPromise)

  //     wrapper = mountComponent()
  //     const selectComponent = wrapper.findComponent(SelectComponent)

  //     await selectComponent.setValue('0x1234567890123456789012345678901234567890')
  //     await nextTick()
  //     await flushPromises()

  //     const button = wrapper.find('[data-test="add-token-button"]')
  //     await button.trigger('click')

  //     // Check loading state
  //     const buttonComponent = wrapper.findComponent(ButtonUI)
  //     expect(buttonComponent.props('loading')).toBe(true)
  //     expect(buttonComponent.props('disabled')).toBe(true)

  //     resolveWriteContract!({})
  //     await flushPromises()

  //     // Check loading state is cleared
  //     expect(buttonComponent.props('loading')).toBe(false)
  //   })
  // })

  // describe('Edge Cases and Validation', () => {
  //   it('should use debounced function for checking token support', () => {
  //     wrapper = mountComponent()

  //     expect(mockUseDebounceFn).toHaveBeenCalledWith(expect.any(Function), 300)
  //   })
  // })
})
