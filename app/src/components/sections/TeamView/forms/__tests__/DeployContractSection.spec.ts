import { describe, it, vi, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import { createTestingPinia } from '@pinia/testing'
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query'
import ButtonUI from '@/components/ButtonUI.vue'
import DeployContractSection from '@/components/sections/TeamView/forms/DeployContractSection.vue'

// Hoisted mocks without reactive refs (following project patterns)
const {
  mockUseSafe,
  mockAddSuccessToast,
  mockAddErrorToast,
  mockUseCustomFetch,
  mockUseWatchContractEvent
} = vi.hoisted(() => ({
  mockUseSafe: {
    deploySafe: vi.fn(),
    isBusy: { value: false } // Plain object instead of ref
  },
  mockAddSuccessToast: vi.fn(),
  mockAddErrorToast: vi.fn(),
  mockUseCustomFetch: vi.fn(),
  mockUseWatchContractEvent: vi.fn().mockImplementation((config) => ({
    onLogs: config?.onLogs || vi.fn()
  }))
}))

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

// Mock wagmi composables that are used in useSafeWrites
vi.mock('@wagmi/vue', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    useWriteContract: vi.fn(() => mockUseWriteContract),
    useWaitForTransactionReceipt: vi.fn(() => mockUseWaitForTransactionReceipt),
    useWatchContractEvent: mockUseWatchContractEvent,
    // Add these to fix the WagmiPluginNotFoundError
    useConnection: vi.fn(() => ({ status: 'connected' })),
    useChainId: vi.fn(() => ref(11155111)), // Sepolia testnet
    useConfig: vi.fn(() => ({}))
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

const mockUserStore = {
  address: '0x1234567890123456789012345678901234567890'
}

vi.mock('@/stores/user', () => ({
  useUserDataStore: vi.fn(() => mockUserStore)
}))

vi.mock('@/stores/useToastStore', () => ({
  useToastStore: vi.fn(() => ({
    addSuccessToast: mockAddSuccessToast,
    addErrorToast: mockAddErrorToast
  }))
}))

// Mock the entire safe composable to avoid wagmi plugin errors
vi.mock('@/composables/safe', () => ({
  default: vi.fn(() => ({
    deploySafe: mockUseSafe.deploySafe,
    isBusy: mockIsBusy
  }))
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
  validateAddresses: vi.fn(() => true)
}))

vi.mock('@/utils', () => ({
  log: {
    error: vi.fn()
  }
}))

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

    it('should bail when team id is missing before Safe deploy', async () => {
      const wrapper = createWrapper({
        createdTeamData: { id: null, name: 'Team 1', address: '' }
      })

      await wrapper.vm.deploySafeForTeam()

      expect(mockAddErrorToast).toHaveBeenCalledWith('Team data not found')
    })

    it('should reject invalid wallet before Safe deploy', async () => {
      mockUserStore.address = 'invalid-address'
      const viemModule = await import('viem')
      const isAddressMock = vi.mocked(viemModule.isAddress)
      isAddressMock.mockReturnValueOnce(false)
      const wrapper = createWrapper()

      await wrapper.vm.deploySafeForTeam()

      expect(mockAddErrorToast).toHaveBeenCalledWith(
        'Invalid wallet address. Please connect your wallet.'
      )

      mockUserStore.address = '0x1234567890123456789012345678901234567890'
    })

    it('runs Safe deployment flow and updates team', async () => {
      mockUseSafe.deploySafe.mockResolvedValueOnce('0xsafeaddress')
      mockUseCustomFetch.mockReturnValue({
        put: vi.fn().mockReturnValue({
          json: vi.fn().mockResolvedValue({ error: ref(null) })
        })
      })

      const wrapper = createWrapper()
      await wrapper.vm.deploySafeForTeam()

      expect(mockUseSafe.deploySafe).toHaveBeenCalledWith(
        ['0x1234567890123456789012345678901234567890'],
        1
      )
      expect(mockAddSuccessToast).toHaveBeenCalledWith('Safe wallet deployed successfully')
    })

    it('handles Safe team update error gracefully', async () => {
      mockUseSafe.deploySafe.mockResolvedValueOnce('0xsafeaddress')
      mockUseCustomFetch.mockReturnValue({
        put: vi.fn().mockReturnValue({
          json: vi.fn().mockResolvedValue({ error: ref('update failed') })
        })
      })

      const wrapper = createWrapper()
      await wrapper.vm.deploySafeForTeam()

      expect(mockAddErrorToast).toHaveBeenCalledWith('Failed to update team with Safe address')
    })

    it('handles Safe deployment failure', async () => {
      mockUseSafe.deploySafe.mockRejectedValueOnce(new Error('boom'))
      const wrapper = createWrapper()

      await wrapper.vm.deploySafeForTeam()

      expect(mockAddErrorToast).toHaveBeenCalledWith(
        'Failed to deploy Safe wallet. Please try again.'
      )
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

    it('processes contract event logs and triggers Safe deploy', async () => {
      mockUseSafe.deploySafe.mockResolvedValueOnce('0xsafeaddress')
      mockWriteContractData.value = '0xabc'

      // ensure successful fetches for officer update + sync + safe update
      mockUseCustomFetch.mockReturnValue({
        put: vi.fn().mockReturnValue({
          json: vi.fn().mockResolvedValue({ error: ref(null) })
        })
      })

      createWrapper()

      const watchCall = mockUseWatchContractEvent.mock.calls[0]?.[0]
      expect(watchCall).toBeTruthy()

      const onLogs = watchCall.onLogs as (
        logs: Array<{ transactionHash: string; args: { deployer: string; proxy: string } }>
      ) => Promise<void>
      await onLogs([
        {
          transactionHash: '0xabc',
          args: {
            deployer: '0x1234567890123456789012345678901234567890',
            proxy: '0xproxy'
          }
        }
      ])

      expect(mockUseSafe.deploySafe).toHaveBeenCalled()
      expect(mockAddSuccessToast).toHaveBeenCalledWith('Safe wallet deployed successfully')
    })
  })
})
