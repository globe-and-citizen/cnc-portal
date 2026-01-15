import { describe, it, vi, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import ContinueAddTeamForm from '@/components/sections/TeamView/forms/ContinueAddTeamForm.vue'
import type { Team } from '@/types/team'
import { createTestingPinia } from '@pinia/testing'
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query'
import DeployContractSection from '@/components/sections/TeamView/forms/DeployContractSection.vue'

// Hoisted mocks for Safe composables
const { mockUseSafe } = vi.hoisted(() => ({
  mockUseSafe: {
    deploySafe: vi.fn(),
    isBusy: { value: false }
  }
}))

// Create reactive refs after Vue is imported
const mockIsBusy = ref(false)
const mockWriteContractError = ref<Error | null>(null)
const mockWriteContractPending = ref(false)
const mockWriteContractData = ref<string | null>(null)
const mockReceiptIsLoading = ref(false)
const mockReceiptIsSuccess = ref(false)

// Update the hoisted mock to use our reactive ref
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
  data: ref(null)
}

// Mock wagmi composables - includes all composables used by useSafeWrites
vi.mock('@wagmi/vue', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    useWriteContract: vi.fn(() => mockUseWriteContract),
    useWaitForTransactionReceipt: vi.fn(() => mockUseWaitForTransactionReceipt),
    useWatchContractEvent: vi.fn(() => ({ onLogs: vi.fn() })),
    // Add these to fix WagmiPluginNotFoundError
    useConnection: vi.fn(() => ({ status: 'connected' })),
    useChainId: vi.fn(() => ref(11155111)), // Sepolia testnet
    useConfig: vi.fn(() => ({}))
  }
})

// Mock viem utilities
vi.mock('viem', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    encodeFunctionData: vi.fn(() => 'EncodedFunctionData'),
    isAddress: vi.fn(() => true),
    zeroAddress: '0x0000000000000000000000000000000000000000'
  }
})

// Mock the entire safe composable
vi.mock('@/composables/safe', () => ({
  default: vi.fn(() => ({
    deploySafe: mockUseSafe.deploySafe,
    isBusy: mockIsBusy
  }))
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
    getTokenPrice: vi.fn(() => 0),
    localCurrency: ref({
      code: 'USD',
      name: 'US Dollar',
      symbol: '$'
    })
  }))
}))

// Mock user store
vi.mock('@/stores/user', () => ({
  useUserDataStore: vi.fn(() => ({
    address: '0x1234567890123456789012345678901234567890'
  }))
}))

// Mock toast store
vi.mock('@/stores/useToastStore', () => ({
  useToastStore: vi.fn(() => ({
    addSuccessToast: vi.fn(),
    addErrorToast: vi.fn()
  }))
}))

// Mock constants - Use importOriginal to preserve BACKEND_URL
vi.mock('@/constant', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/constant')>()
  return {
    ...actual,
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
    validateAddresses: vi.fn(() => true),
    BACKEND_URL: actual.BACKEND_URL || 'http://localhost:3000' // Preserve or provide default
  }
})

// Mock utils
vi.mock('@/utils', () => ({
  log: {
    error: vi.fn()
  }
}))

const team = ref<Partial<Team>>({
  id: '1',
  name: 'Team 1',
  description: 'Team 1 description',
  ownerAddress: '0x4b6Bf5cD91446408290725879F5666dcd9785F62',
  officerAddress: '0x4b6Bf5cD91446408290725879F5666dcd9785F62'
})

describe('ContinueAddTeamForm', () => {
  let queryClient: QueryClient

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
    mockIsBusy.value = false
  })

  it('should render the component', async () => {
    const wrapper = mount(ContinueAddTeamForm, {
      props: {
        team: team.value
      },
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn }), [VueQueryPlugin, { queryClient }]]
      }
    })

    expect(wrapper.exists()).toBe(true)

    // Expect the error message to not be displayed by default
    expect(wrapper.find("[data-test='share-name-error']").exists()).toBeFalsy()
    expect(wrapper.find("[data-test='share-symbol-error']").exists()).toBeFalsy()

    const symbolInput = wrapper.find("[data-test='share-symbol-input']")
    await symbolInput.setValue('WG')
    await symbolInput.trigger('keyup')
    await wrapper.vm.$nextTick()

    // Expect the error message to be displayed
    expect(wrapper.find("[data-test='share-symbol-error']").exists()).toBeTruthy()

    await symbolInput.setValue('WGG')
    await symbolInput.trigger('keyup')
    await wrapper.vm.$nextTick()

    // Expect the error message to not be displayed
    expect(wrapper.find("[data-test='share-symbol-error']").exists()).toBeFalsy()

    const nameInput = wrapper.find("[data-test='share-name-input']")
    await nameInput.setValue('WA')
    await nameInput.trigger('keyup')
    await wrapper.vm.$nextTick()

    // Expect the error message to be displayed
    expect(wrapper.find("[data-test='share-name-error']").exists()).toBeTruthy()

    await nameInput.setValue('WAGMI')
    await nameInput.trigger('keyup')
    await wrapper.vm.$nextTick()

    // Expect the error message to not be displayed
    expect(wrapper.find("[data-test='share-name-error']").exists()).toBeFalsy()

    const deployComponent = wrapper.findComponent(DeployContractSection)
    expect(wrapper.emitted('done')).toBeFalsy()

    await deployComponent.vm.$emit('contractDeployed')

    // Check if wrapper emit done event
    expect(wrapper.emitted('done')).toBeTruthy()
  })

  it('should validate share symbol with correct length', async () => {
    const wrapper = mount(ContinueAddTeamForm, {
      props: { team: team.value },
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn }), [VueQueryPlugin, { queryClient }]]
      }
    })

    const symbolInput = wrapper.find("[data-test='share-symbol-input']")

    // Test too short (< 3 characters)
    await symbolInput.setValue('AB')
    await symbolInput.trigger('keyup')
    await wrapper.vm.$nextTick()
    expect(wrapper.find("[data-test='share-symbol-error']").exists()).toBeTruthy()

    // Test valid length (>= 3 characters)
    await symbolInput.setValue('ABC')
    await symbolInput.trigger('keyup')
    await wrapper.vm.$nextTick()
    expect(wrapper.find("[data-test='share-symbol-error']").exists()).toBeFalsy()
  })

  it('should validate share name with correct length', async () => {
    const wrapper = mount(ContinueAddTeamForm, {
      props: { team: team.value },
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn }), [VueQueryPlugin, { queryClient }]]
      }
    })

    const nameInput = wrapper.find("[data-test='share-name-input']")

    // Test too short (< 3 characters)
    await nameInput.setValue('AB')
    await nameInput.trigger('keyup')
    await wrapper.vm.$nextTick()
    expect(wrapper.find("[data-test='share-name-error']").exists()).toBeTruthy()

    // Test exactly 3 characters - still shows error (validation requires > 3)
    await nameInput.setValue('ABC')
    await nameInput.trigger('keyup')
    await wrapper.vm.$nextTick()
    expect(wrapper.find("[data-test='share-name-error']").exists()).toBeTruthy()

    // Test valid length (> 3 characters)
    await nameInput.setValue('ABCD')
    await nameInput.trigger('keyup')
    await wrapper.vm.$nextTick()
    expect(wrapper.find("[data-test='share-name-error']").exists()).toBeFalsy()
  })

  it('should emit done event when contract is deployed', async () => {
    const wrapper = mount(ContinueAddTeamForm, {
      props: { team: team.value },
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn }), [VueQueryPlugin, { queryClient }]]
      }
    })

    const deployComponent = wrapper.findComponent(DeployContractSection)

    expect(wrapper.emitted('done')).toBeFalsy()

    await deployComponent.vm.$emit('contractDeployed')

    expect(wrapper.emitted('done')).toBeTruthy()
    expect(wrapper.emitted('done')).toHaveLength(1)
  })
})
