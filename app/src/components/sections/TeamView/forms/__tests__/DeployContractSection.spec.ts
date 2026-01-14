import { describe, it, vi, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import { createTestingPinia } from '@pinia/testing'
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query'
import ButtonUI from '@/components/ButtonUI.vue'
import DeployContractSection from '@/components/sections/TeamView/forms/DeployContractSection.vue'

// Hoisted mocks without reactive refs (following project patterns)
const { mockUseSafe, mockAddSuccessToast, mockAddErrorToast, mockUseCustomFetch } = vi.hoisted(
  () => ({
    mockUseSafe: {
      deploySafe: vi.fn(),
      isBusy: { value: false } // Plain object instead of ref
    },
    mockAddSuccessToast: vi.fn(),
    mockAddErrorToast: vi.fn(),
    mockUseCustomFetch: vi.fn()
  })
)

// Create reactive refs after Vue is imported
const mockIsBusy = ref(false)
const mockWriteContractError = ref<Error | null>(null)
const mockWriteContractPending = ref(false)
const mockWriteContractData = ref<string | null>(null)
const mockReceiptIsLoading = ref(false)
const mockReceiptIsSuccess = ref(false)
const mockReceiptData = ref(null)

// Update the hoisted mock to use our reactive refs
mockUseSafe.isBusy = mockIsBusy

const mockUseWriteContract = {
  writeContract: vi.fn(),
  error: mockWriteContractError,
  isPending: mockWriteContractPending,
  data: mockWriteContractData
}

const mockUseWaitForTransactionReceipt = {
  isLoading: mockReceiptIsLoading,
  isSuccess: mockReceiptIsSuccess,
  data: mockReceiptData
}

const mockUseWatchContractEvent = vi.fn().mockImplementation((config) => {
  return {
    onLogs: config?.onLogs || vi.fn()
  }
})

vi.mock('@wagmi/vue', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    useWriteContract: vi.fn(() => mockUseWriteContract),
    useWaitForTransactionReceipt: vi.fn(() => mockUseWaitForTransactionReceipt),
    useWatchContractEvent: vi.fn(() => mockUseWatchContractEvent)
  }
})

vi.mock('viem', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    encodeFunctionData: vi.fn(() => 'EncodedFunctionData'),
    isAddress: vi.fn(() => true),
    zeroAddress: '0x0000000000000000000000000000000000000000'
  }
})

vi.mock('@/stores/user', () => ({
  useUserDataStore: vi.fn(() => ({
    address: '0x1234567890123456789012345678901234567890'
  }))
}))

vi.mock('@/stores/useToastStore', () => ({
  useToastStore: vi.fn(() => ({
    addSuccessToast: mockAddSuccessToast,
    addErrorToast: mockAddErrorToast
  }))
}))

vi.mock('@/composables/useSafe', () => ({
  useSafe: vi.fn(() => mockUseSafe)
}))

vi.mock('@/composables/useCustomFetch', () => ({
  useCustomFetch: mockUseCustomFetch
}))

// Mock currency store to prevent Vue Query errors
vi.mock('@/stores/currencyStore', () => ({
  useCurrencyStore: vi.fn(() => ({
    getTokenInfo: vi.fn(() => ({
      id: 'native',
      name: 'Native Token',
      symbol: 'ETH',
      prices: []
    })),
    getTokenPrice: vi.fn(() => 0)
  }))
}))

// Update your hoisted mock to be configurable
vi.mock('@/constant', () => ({
  BANK_BEACON_ADDRESS: '0x1111111111111111111111111111111111111111',
  BOD_BEACON_ADDRESS: '0x2222222222222222222222222222222222222222',
  PROPOSALS_BEACON_ADDRESS: '0x3333333333333333333333333333333333333333',
  EXPENSE_ACCOUNT_EIP712_BEACON_ADDRESS: '0x4444444444444444444444444444444444444444',
  CASH_REMUNERATION_EIP712_BEACON_ADDRESS: '0x5555555555555555555555555555555555555555',
  INVESTOR_V1_BEACON_ADDRESS: '0x6666666666666666666666666666666666666666',
  ELECTIONS_BEACON_ADDRESS: '0x7777777777777777777777777777777777777777',
  OFFICER_BEACON: '0x8888888888888888888888888888888888888888',
  USDC_ADDRESS: '0x9999999999999999999999999999999999999999',
  USDT_ADDRESS: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  validateAddresses: vi.fn(() => true) // This is now a proper mock function
}))

vi.mock('@/utils', () => ({
  log: {
    error: vi.fn()
  }
}))

// Add this helper after the mocks but before the describe block
// const getValidateAddressesMock = () => {
//   return vi.mocked(vi.importActual('@/constant')).validateAddresses
// }

describe('DeployContractSection', () => {
  let queryClient: QueryClient

  const defaultProps = {
    investorContractInput: {
      name: 'Investor Contract',
      symbol: 'INV'
    },
    createdTeamData: {
      id: '1',
      name: 'Team 1',
      address: '0xTeamAddress'
    }
  }

  const createWrapper = (props = {}) => {
    return mount(DeployContractSection, {
      props: {
        ...defaultProps,
        ...props
      },
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn }), [VueQueryPlugin, { queryClient }]],
        mocks: {
          $t: (msg: string) => msg
        }
      }
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()

    // Create fresh QueryClient for each test
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    })

    // Reset reactive values
    mockWriteContractError.value = null
    mockWriteContractPending.value = false
    mockWriteContractData.value = null
    mockReceiptIsLoading.value = false
    mockReceiptIsSuccess.value = false
    mockReceiptData.value = null
    mockIsBusy.value = false

    // Reset mock implementations
    mockUseCustomFetch.mockReturnValue({
      put: vi.fn().mockReturnValue({
        json: vi.fn().mockResolvedValue({ error: ref(null) })
      })
    })
  })

  describe('Component Rendering', () => {
    it('should render the deploy button correctly', () => {
      const wrapper = createWrapper()
      const deployButton = wrapper.find('[data-test="deploy-contracts-button"]')

      expect(deployButton.exists()).toBe(true)
      expect(deployButton.findComponent(ButtonUI).exists()).toBe(true)
    })

    it('should disable the deploy button when disable prop is true', () => {
      const wrapper = createWrapper({ disable: true })
      const buttonComponent = wrapper
        .find('[data-test="deploy-contracts-button"]')
        .findComponent(ButtonUI)

      expect(buttonComponent.props('disabled')).toBe(true)
    })

    it('should disable the deploy button during loading states', async () => {
      const wrapper = createWrapper()
      const buttonComponent = wrapper
        .find('[data-test="deploy-contracts-button"]')
        .findComponent(ButtonUI)

      // Test write contract pending state
      mockWriteContractPending.value = true
      await wrapper.vm.$nextTick()
      expect(buttonComponent.props('disabled')).toBe(true)

      // Test transaction receipt loading state
      mockWriteContractPending.value = false
      mockReceiptIsLoading.value = true
      await wrapper.vm.$nextTick()
      expect(buttonComponent.props('disabled')).toBe(true)

      // Test Safe deployment loading state
      mockReceiptIsLoading.value = false
      mockIsBusy.value = true
      await wrapper.vm.$nextTick()
      expect(buttonComponent.props('disabled')).toBe(true)
    })

    it('should show correct button text based on state', async () => {
      const wrapper = createWrapper()
      const buttonComponent = wrapper
        .find('[data-test="deploy-contracts-button"]')
        .findComponent(ButtonUI)

      // Default state
      expect(buttonComponent.text()).toContain('Deploy Team Contracts')

      // Safe deploying state
      mockIsBusy.value = true
      await wrapper.vm.$nextTick()
      expect(buttonComponent.text()).toContain('Deploying Safe Wallet')

      // Officer contract deploying state
      mockIsBusy.value = false
      mockWriteContractPending.value = true
      await wrapper.vm.$nextTick()
      expect(buttonComponent.text()).toContain('Deploying Officer Contracts')
    })
  })

  describe('Contract Deployment Process', () => {
    it.skip('should call writeContract with correct parameters when deploy button is clicked', async () => {
      const wrapper = createWrapper()
      const deployButton = wrapper.find('[data-test="deploy-contracts-button"]')

      await deployButton.trigger('click')

      expect(mockUseWriteContract.writeContract).toHaveBeenCalledWith(
        expect.objectContaining({
          address: expect.any(String),
          functionName: 'createBeaconProxy'
        })
      )
    })

    it('should handle deployment errors gracefully', async () => {
      const wrapper = createWrapper()

      // Simulate an error during deployment
      mockWriteContractError.value = new Error('Deployment failed')
      await wrapper.vm.$nextTick()

      expect(mockAddErrorToast).toHaveBeenCalledWith('Failed to create officer contract')
    })

    it('should handle validation errors', async () => {
      // Import the constant module to access the mocked function
      const constantModule = await import('@/constant')
      const mockValidateAddresses = vi.mocked(constantModule.validateAddresses)

      mockValidateAddresses.mockImplementationOnce(() => {
        throw new Error('Invalid addresses')
      })

      const wrapper = createWrapper()
      const deployButton = wrapper.find('[data-test="deploy-contracts-button"]')

      await deployButton.trigger('click')

      expect(mockAddErrorToast).toHaveBeenCalledWith('Error deploying contract')
    })
  })

  describe('Loading State Management', () => {
    it('should manage loading states correctly throughout deployment process', async () => {
      const wrapper = createWrapper()
      const buttonComponent = wrapper
        .find('[data-test="deploy-contracts-button"]')
        .findComponent(ButtonUI)

      // Initial state
      expect(buttonComponent.props('loading')).toBe(false)
      expect(buttonComponent.props('disabled')).toBe(false)

      // During officer contract creation
      mockWriteContractPending.value = true
      await wrapper.vm.$nextTick()
      expect(buttonComponent.props('loading')).toBe(true)
      expect(buttonComponent.props('disabled')).toBe(true)

      // During transaction confirmation
      mockWriteContractPending.value = false
      mockReceiptIsLoading.value = true
      await wrapper.vm.$nextTick()
      expect(buttonComponent.props('loading')).toBe(true)
      expect(buttonComponent.props('disabled')).toBe(true)

      // During Safe deployment
      mockReceiptIsLoading.value = false
      mockIsBusy.value = true
      await wrapper.vm.$nextTick()
      expect(buttonComponent.props('loading')).toBe(true)
      expect(buttonComponent.props('disabled')).toBe(true)
    })

    it('should reset loading state after completion', async () => {
      const wrapper = createWrapper()

      // Simulate completion
      mockWriteContractPending.value = false
      mockReceiptIsLoading.value = false
      mockIsBusy.value = false
      await wrapper.vm.$nextTick()

      const buttonComponent = wrapper
        .find('[data-test="deploy-contracts-button"]')
        .findComponent(ButtonUI)
      expect(buttonComponent.props('loading')).toBe(false)
      expect(buttonComponent.props('disabled')).toBe(false)
    })
  })

  describe('Edge Cases', () => {
    it('should handle missing team data gracefully', () => {
      const wrapper = createWrapper({
        createdTeamData: { id: null, name: '', address: '' }
      })

      expect(wrapper.exists()).toBe(true)
      // Component should render but deployment should not work with invalid data
    })

    it('should handle partial props', () => {
      const wrapper = createWrapper({
        investorContractInput: { name: '', symbol: '' }
      })

      expect(wrapper.exists()).toBe(true)
    })

    it('should handle undefined team gracefully', () => {
      const wrapper = createWrapper({
        createdTeamData: null
      })

      expect(wrapper.exists()).toBe(true)
    })
  })

  describe('Error Handling', () => {
    it('should handle contract deployment error', async () => {
      const wrapper = createWrapper()

      mockWriteContractError.value = new Error('Deployment failed')
      await wrapper.vm.$nextTick()

      expect(mockAddErrorToast).toHaveBeenCalledWith('Failed to create officer contract')
    })

    it('should handle network errors', async () => {
      const wrapper = createWrapper()

      mockWriteContractError.value = new Error('Network request failed')
      await wrapper.vm.$nextTick()

      expect(mockAddErrorToast).toHaveBeenCalledWith('Failed to create officer contract')
    })

    it('should handle user rejection errors', async () => {
      const wrapper = createWrapper()

      mockWriteContractError.value = new Error('User rejected the request')
      await wrapper.vm.$nextTick()

      expect(mockAddErrorToast).toHaveBeenCalledWith('Failed to create officer contract')
    })
  })
})
