import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import CRSigne from '../CRSigne.vue'
import { createPinia, setActivePinia } from 'pinia'
import type { WeeklyClaim } from '@/types'
import { ref, nextTick } from 'vue'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import isoWeek from 'dayjs/plugin/isoWeek'

// Configure dayjs plugins
dayjs.extend(utc)
dayjs.extend(isoWeek)

// Hoisted mocks
const {
  mockUseTeamStore,
  mockUseUserDataStore,
  mockUseToastStore,
  mockUseSignTypedData,
  mockUseReadContract,
  mockUseCustomFetch,
  mockUseQueryClient
} = vi.hoisted(() => {
  const mockExecuteUpdateClaim = vi.fn().mockResolvedValue(undefined)

  return {
    mockUseTeamStore: vi.fn(),
    mockUseUserDataStore: vi.fn(),
    mockUseToastStore: vi.fn(),
    mockUseSignTypedData: vi.fn(),
    mockUseReadContract: vi.fn(),
    mockUseCustomFetch: vi.fn(() => ({
      put: vi.fn(() => ({
        json: vi.fn(() => ({
          execute: mockExecuteUpdateClaim,
          error: ref(null)
        }))
      }))
    })),
    mockUseQueryClient: vi.fn(() => ({
      invalidateQueries: vi.fn()
    }))
  }
})

// Mock @tanstack/vue-query
vi.mock('@tanstack/vue-query', () => ({
  useQueryClient: mockUseQueryClient
}))

// Mock the stores
vi.mock('@/stores', () => ({
  useTeamStore: mockUseTeamStore,
  useUserDataStore: mockUseUserDataStore,
  useToastStore: mockUseToastStore
}))

// Mock wagmi
vi.mock('@wagmi/vue', async () => {
  const actual = await vi.importActual('@wagmi/vue')
  return {
    ...actual,
    useSignTypedData: mockUseSignTypedData,
    useChainId: vi.fn(() => ref(1)),
    useReadContract: mockUseReadContract
  }
})

// Mock composables
vi.mock('@/composables', () => ({
  useCustomFetch: mockUseCustomFetch
}))

// Mock the constant imports
vi.mock('@/constant', () => ({
  USDC_ADDRESS: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
}))

// Mock the utils
vi.mock('@/utils', () => ({
  log: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn()
  }
}))

describe('CRSigne', () => {
  let wrapper: ReturnType<typeof mount>

  const MOCK_OWNER_ADDRESS = '0x1234567890123456789012345678901234567890'
  const MOCK_CONTRACT_ADDRESS = '0x9876543210987654321098765432109876543210'

  const mockClaim: WeeklyClaim = {
    id: 1,
    status: 'pending',
    hoursWorked: 8,
    createdAt: '2024-01-01T00:00:00Z',
    wage: {
      userAddress: MOCK_OWNER_ADDRESS,
      ratePerHour: [{ type: 'native', amount: 10 }],
      id: 0,
      teamId: 0,
      cashRatePerHour: 0,
      tokenRatePerHour: 0,
      usdcRatePerHour: 0,
      maximumHoursPerWeek: 0,
      nextWageId: null,
      createdAt: '',
      updatedAt: ''
    },
    weekStart: '2024-01-01T00:00:00Z',
    data: {
      ownerAddress: MOCK_OWNER_ADDRESS
    },
    memberAddress: MOCK_OWNER_ADDRESS,
    teamId: 0,
    signature: null,
    wageId: 0,
    updatedAt: '',
    claims: []
  }

  const mockTeamStoreValue = {
    currentTeam: {
      id: 1,
      ownerAddress: MOCK_OWNER_ADDRESS,
      teamContracts: [
        {
          type: 'CashRemunerationEIP712',
          address: MOCK_CONTRACT_ADDRESS
        }
      ]
    },
    getContractAddressByType: vi.fn((type: string) => {
      if (type === 'CashRemunerationEIP712') return MOCK_CONTRACT_ADDRESS
      if (type === 'InvestorV1') return '0x1111111111111111111111111111111111111111'
      return undefined
    })
  }

  const mockUserDataStoreValue = {
    address: MOCK_OWNER_ADDRESS
  }

  const mockToastStoreValue = {
    addErrorToast: vi.fn(),
    addSuccessToast: vi.fn()
  }

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()

    // Setup store mocks
    mockUseTeamStore.mockReturnValue(mockTeamStoreValue)
    mockUseUserDataStore.mockReturnValue(mockUserDataStoreValue)
    mockUseToastStore.mockReturnValue(mockToastStoreValue)

    // Setup wagmi mocks
    mockUseSignTypedData.mockReturnValue({
      signTypedDataAsync: vi.fn().mockResolvedValue('0xmocksignature'),
      data: ref('0xmocksignature')
    })

    mockUseReadContract.mockReturnValue({
      data: ref(MOCK_OWNER_ADDRESS),
      error: ref(null),
      isFetching: ref(false)
    })
  })

  afterEach(() => {
    if (wrapper) wrapper.unmount()
  })

  describe('Approve Functionality', () => {
    it('should show success toast after successful approval', async () => {
      const mockSignTypedDataAsync = vi.fn().mockResolvedValue('0xsignature')
      const mockExecuteUpdate = vi.fn().mockResolvedValue(undefined)

      mockUseSignTypedData.mockReturnValue({
        signTypedDataAsync: mockSignTypedDataAsync,
        data: ref('0xsignature')
      })

      mockUseCustomFetch.mockReturnValue({
        put: vi.fn(() => ({
          json: vi.fn(() => ({
            execute: mockExecuteUpdate,
            error: ref(null)
          }))
        }))
      })

      wrapper = mount(CRSigne, {
        props: {
          weeklyClaim: mockClaim
        }
      })

      await nextTick()
      await wrapper.find('[data-test="approve-button"]').trigger('click')
      await nextTick()
      await vi.dynamicImportSettled()

      expect(mockToastStoreValue.addSuccessToast).toHaveBeenCalledWith('Claim approved')
    })

    it('Should emit close event after approve', async () => {
      wrapper = mount(CRSigne, {
        props: {
          weeklyClaim: mockClaim,
          isDropDown: true
        }
      })

      await flushPromises()

      const button = wrapper.findComponent({ name: 'ButtonUI' })
      expect(button.exists()).toBeFalsy()
      const signAction = wrapper.find('[data-test="sign-action"]')
      expect(signAction.exists()).toBeTruthy()
      await signAction.trigger('click')
      await flushPromises()
      expect(wrapper.emitted()).toHaveProperty('close')
    })
  })

  describe('Error Handling', () => {
    it('should show error toast when user rejects signature', async () => {
      const mockSignTypedDataAsync = vi
        .fn()
        .mockRejectedValue(new Error('User rejected the request'))

      mockUseSignTypedData.mockReturnValue({
        signTypedDataAsync: mockSignTypedDataAsync,
        data: ref(null)
      })

      wrapper = mount(CRSigne, {
        props: {
          weeklyClaim: mockClaim
        }
      })

      await nextTick()
      await wrapper.find('[data-test="approve-button"]').trigger('click')
      await nextTick()

      expect(mockToastStoreValue.addErrorToast).toHaveBeenCalledWith('User rejected the request')
    })

    it('should show error toast when claim update fails', async () => {
      const mockSignTypedDataAsync = vi.fn().mockResolvedValue('0xsignature')
      const mockExecuteUpdate = vi.fn().mockResolvedValue(undefined)
      const errorRef = ref<Error | null>(new Error('Update failed'))

      mockUseSignTypedData.mockReturnValue({
        signTypedDataAsync: mockSignTypedDataAsync,
        data: ref('0xsignature')
      })

      mockUseCustomFetch.mockReturnValue({
        put: vi.fn(() => ({
          json: vi.fn(() => ({
            execute: mockExecuteUpdate,
            error: errorRef
          }))
        }))
      })

      wrapper = mount(CRSigne, {
        props: {
          weeklyClaim: mockClaim
        }
      })

      await nextTick()
      await wrapper.find('[data-test="approve-button"]').trigger('click')
      await nextTick()
      await vi.dynamicImportSettled()

      expect(mockToastStoreValue.addErrorToast).toHaveBeenCalledWith(
        'Failed to approve weeklyClaim'
      )
    })
  })
})
