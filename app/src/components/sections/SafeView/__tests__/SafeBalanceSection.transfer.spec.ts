import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { nextTick, ref, defineComponent } from 'vue'
import { useStorage } from '@vueuse/core'
import type { Address } from 'viem'
import SafeBalanceSection from '../SafeBalanceSection.vue'
import { mockUseContractBalance, mockUseAccount } from '@/tests/mocks'
import { mockUserStore, mockToast } from '@/tests/mocks/store.mock'

const {
  mockGetSafeHomeUrl,
  mockOpenSafeAppUrl,
  mockUseChainId,
  mockUseTeamStore,
  mockuseGetSafeInfoQuery,
  mockQueryClient,
  mockTransferMutate,
  mockTransferReset,
  mockTransferPending,
  mockUseTransferFromSafeMutation
} = vi.hoisted(() => ({
  mockGetSafeHomeUrl: vi.fn(),
  mockOpenSafeAppUrl: vi.fn(),
  mockUseChainId: vi.fn(),
  mockUseTeamStore: vi.fn(),
  mockuseGetSafeInfoQuery: vi.fn(),
  mockQueryClient: {
    invalidateQueries: vi.fn()
  },
  mockTransferMutate: vi.fn(),
  mockTransferReset: vi.fn(),
  mockTransferPending: { value: false },
  mockUseTransferFromSafeMutation: vi.fn(() => ({
    mutate: mockTransferMutate,
    isPending: mockTransferPending,
    reset: mockTransferReset
  }))
}))

// Mock external dependencies
vi.mock('@/composables/safe', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    getSafeHomeUrl: mockGetSafeHomeUrl,
    openSafeAppUrl: mockOpenSafeAppUrl
  }
})

vi.mock('@vueuse/core', async () => {
  const actual = await vi.importActual<typeof import('@vueuse/core')>('@vueuse/core')
  return {
    ...actual,
    useStorage: vi.fn()
  }
})

vi.mock('@/queries/safe.queries', () => ({
  useGetSafeInfoQuery: mockuseGetSafeInfoQuery
}))

vi.mock('@/queries/safe.mutations', () => ({
  useTransferFromSafeMutation: mockUseTransferFromSafeMutation
}))

vi.mock('@tanstack/vue-query', () => ({
  useQueryClient: () => mockQueryClient
}))

vi.mock('@/utils', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    getTokenAddress: vi.fn((tokenId: string) => {
      if (tokenId === 'native') return undefined
      if (tokenId === 'usdc') return '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
      if (tokenId === 'usdt') return '0xdAC17F958D2ee523a2206206994597C13D831ec7'
      return undefined
    })
  }
})

// Test constants
const MOCK_DATA = {
  safeAddress: '0x1234567890123456789012345678901234567890' as Address,
  safeInfo: { owners: ['0x1111111111111111111111111111111111111111' as Address], threshold: 2 },
  balances: [
    {
      token: { symbol: 'ETH', id: 'ethereum', name: 'Ethereum', code: 'ETH' },
      amount: 1.5,
      values: { USD: { value: 3000, formated: '$3,000', price: 2000 } }
    },
    {
      token: { symbol: 'SHER', id: 'sher', name: 'Sherlock', code: 'SHER' },
      amount: 100,
      values: { USD: { value: 500, formated: '$500', price: 5 } }
    }
  ],
  total: { USD: { value: 4500, formated: '$4,500', price: 1 } },
  defaultCurrency: { code: 'USD', name: 'US Dollar', symbol: '$' },
  team: {
    safeAddress: '0x1234567890123456789012345678901234567890' as Address,
    id: '1',
    name: 'Test Team'
  },
  teamMeta: { data: { safeAddress: '0x1234567890123456789012345678901234567890' as Address } }
} as const

// Component stubs
const AddressToolTipStub = defineComponent({ template: '<div></div>' })
const TransferFormStub = defineComponent({
  emits: ['transfer', 'closeModal', 'update:modelValue'],
  props: ['modelValue', 'loading', 'tokens'],
  template:
    "<div><button data-test=\"emit-transfer\" @click=\"$emit('transfer', { address: { name: 'Recipient', address: '0x3333333333333333333333333333333333333333' }, token: modelValue.token, amount: '1' })\">Transfer</button><button data-test=\"emit-invalid-transfer\" @click=\"$emit('transfer', { address: { name: '', address: '' }, token: modelValue.token, amount: '0' })\">Invalid</button></div>"
})

describe('SafeBalanceSection', () => {
  let wrapper: VueWrapper
  const mockCurrency = ref(MOCK_DATA.defaultCurrency)
  const mockSafeInfo = ref(MOCK_DATA.safeInfo)

  const createWrapper = (props = {}) =>
    mount(SafeBalanceSection, {
      props: {
        address: MOCK_DATA.safeAddress,
        ...props
      },
      global: {
        stubs: {
          AddressToolTip: AddressToolTipStub,
          TransferForm: TransferFormStub
        }
      }
    })

  beforeEach(() => {
    vi.clearAllMocks()

    // Configure global contract balance mock
    mockUseContractBalance.isLoading.value = false
    mockUseContractBalance.balances.value =
      MOCK_DATA.balances as typeof mockUseContractBalance.balances.value
    mockUseContractBalance.total.value =
      MOCK_DATA.total as typeof mockUseContractBalance.total.value

    mockuseGetSafeInfoQuery.mockReturnValue({
      data: mockSafeInfo
    })

    mockUseAccount.address.value = MOCK_DATA.safeInfo.owners[0]
    mockUserStore.address = MOCK_DATA.safeInfo.owners[0]

    mockUseChainId.mockReturnValue(ref(137))
    mockUseTeamStore.mockReturnValue({
      currentTeam: MOCK_DATA.team,
      currentTeamMeta: MOCK_DATA.teamMeta
    })

    mockTransferPending.value = false
    mockTransferMutate.mockReset()
    mockTransferReset.mockReset()
    mockToast.add.mockReset()

    vi.mocked(useStorage).mockReturnValue(mockCurrency as never)

    mockGetSafeHomeUrl.mockReturnValue(
      'https://app.safe.global/home?safe=polygon:0x1234567890123456789012345678901234567890'
    )
    mockOpenSafeAppUrl.mockImplementation(() => {})

    // Reset reactive values
    mockSafeInfo.value = MOCK_DATA.safeInfo
  })

  afterEach(() => {
    if (wrapper) wrapper.unmount()
  })

  describe('Transfer Functionality', () => {
    it('should call transferFromSafe when transfer is initiated', async () => {
      wrapper = createWrapper()

      await wrapper.find('[data-test="transfer-button"]').trigger('click')
      await nextTick()
      await wrapper.find('[data-test="emit-transfer"]').trigger('click')
      await nextTick()

      expect(mockTransferMutate).toHaveBeenCalledTimes(1)
      expect(mockTransferMutate).toHaveBeenCalledWith(
        {
          safeAddress: MOCK_DATA.safeAddress,
          options: {
            to: '0x3333333333333333333333333333333333333333',
            amount: '1',
            tokenId: 'ethereum'
          }
        },
        expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) })
      )
    })

    it('should handle transfer loading state', async () => {
      mockTransferPending.value = true
      wrapper = createWrapper()
      await wrapper.find('[data-test="transfer-button"]').trigger('click')
      await nextTick()

      expect(wrapper.findComponent(TransferFormStub).props('loading').value).toBe(true)
    })

    it('should handle transfer validation errors', async () => {
      wrapper = createWrapper()
      await wrapper.find('[data-test="transfer-button"]').trigger('click')
      await nextTick()
      await wrapper.find('[data-test="emit-invalid-transfer"]').trigger('click')
      await nextTick()

      expect(mockTransferMutate).not.toHaveBeenCalled()
    })
  })
})
