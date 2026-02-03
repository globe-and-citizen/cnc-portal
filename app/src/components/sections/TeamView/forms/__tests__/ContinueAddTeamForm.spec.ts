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
