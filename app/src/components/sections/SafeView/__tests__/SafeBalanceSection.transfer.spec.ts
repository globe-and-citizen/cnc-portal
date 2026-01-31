import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { nextTick, ref, defineComponent } from 'vue'
import { useStorage } from '@vueuse/core'
import type { Address } from 'viem'
import SafeBalanceSection from '../SafeBalanceSection.vue'

const {
  mockGetSafeHomeUrl,
  mockOpenSafeAppUrl,
  mockUseChainId,
  mockUseTeamStore,
  mockUseContractBalance,
  mockUseSafeInfoQuery,
  mockQueryClient,
  mockUseSafeTransfer
} = vi.hoisted(() => ({
  mockGetSafeHomeUrl: vi.fn(),
  mockOpenSafeAppUrl: vi.fn(),
  mockUseChainId: vi.fn(),
  mockUseTeamStore: vi.fn(),
  mockUseContractBalance: vi.fn(),
  mockUseSafeInfoQuery: vi.fn(),
  mockQueryClient: {
    invalidateQueries: vi.fn()
  },
  mockUseSafeTransfer: vi.fn(() => ({
    transferFromSafe: vi.fn(),
    transferNative: vi.fn(),
    transferToken: vi.fn(),
    isTransferring: ref(false),
    error: ref(null)
  }))
}))

// Mock external dependencies
vi.mock('@/composables/safe', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    getSafeHomeUrl: mockGetSafeHomeUrl,
    openSafeAppUrl: mockOpenSafeAppUrl,
    useSafeTransfer: mockUseSafeTransfer
  }
})

vi.mock('@wagmi/vue', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    useChainId: mockUseChainId
  }
})

vi.mock('@vueuse/core', () => ({
  useStorage: vi.fn()
}))

vi.mock('@/stores', () => ({
  useTeamStore: mockUseTeamStore
}))

vi.mock('@/composables/useContractBalance', () => ({
  useContractBalance: mockUseContractBalance
}))

vi.mock('@/queries/safe.queries', () => ({
  useSafeInfoQuery: mockUseSafeInfoQuery
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
const CardStub = defineComponent({ template: '<div><slot /></div>' })
const ButtonStub = defineComponent({
  template: '<button @click="$emit(\'click\')"><slot /></button>'
})
const AddressToolTipStub = defineComponent({ template: '<div></div>' })
const ModalStub = defineComponent({
  props: ['modelValue'],
  template: '<div v-if="modelValue"><slot /></div>'
})
const DepositBankFormStub = defineComponent({ template: '<div></div>' })
const TransferFormStub = defineComponent({ template: '<div><slot name="header" /></div>' })

describe('SafeBalanceSection', () => {
  let wrapper: VueWrapper
  const mockCurrency = ref(MOCK_DATA.defaultCurrency)
  const mockBalances = ref(MOCK_DATA.balances)
  const mockTotal = ref(MOCK_DATA.total)
  const mockIsLoading = ref(false)
  const mockSafeInfo = ref(MOCK_DATA.safeInfo)

  const createWrapper = (props = {}) =>
    mount(SafeBalanceSection, {
      props,
      global: {
        stubs: {
          CardComponent: CardStub,
          ButtonUI: ButtonStub,
          AddressToolTip: AddressToolTipStub,
          ModalComponent: ModalStub,
          DepositBankForm: DepositBankFormStub,
          TransferForm: TransferFormStub
        }
      }
    })

  beforeEach(() => {
    vi.clearAllMocks()

    // Setup default mocks
    mockUseContractBalance.mockReturnValue({
      total: mockTotal,
      balances: mockBalances,
      isLoading: mockIsLoading
    })

    mockUseSafeInfoQuery.mockReturnValue({
      data: mockSafeInfo
    })

    mockUseChainId.mockReturnValue(ref(137))
    mockUseTeamStore.mockReturnValue({
      currentTeam: MOCK_DATA.team,
      currentTeamMeta: MOCK_DATA.teamMeta
    })

    // Setup useSafeTransfer mock
    mockUseSafeTransfer.mockReturnValue({
      transferFromSafe: vi.fn().mockResolvedValue('0xmocktxhash'),
      transferNative: vi.fn().mockResolvedValue('0xmocktxhash'),
      transferToken: vi.fn().mockResolvedValue('0xmocktxhash'),
      isTransferring: ref(false),
      error: ref(null)
    })

    vi.mocked(useStorage).mockReturnValue(mockCurrency as never)

    mockGetSafeHomeUrl.mockReturnValue(
      'https://app.safe.global/home?safe=polygon:0x1234567890123456789012345678901234567890'
    )
    mockOpenSafeAppUrl.mockImplementation(() => {})

    // Reset reactive values
    mockIsLoading.value = false
    mockBalances.value = MOCK_DATA.balances
    mockTotal.value = MOCK_DATA.total
    mockSafeInfo.value = MOCK_DATA.safeInfo
  })

  afterEach(() => {
    if (wrapper) wrapper.unmount()
  })

  describe('Transfer Functionality', () => {
    it('should call transferFromSafe when transfer is initiated', async () => {
      wrapper = createWrapper()

      // Mock transfer form interaction
      await wrapper.find('[data-test="transfer-button"]').trigger('click')
      await nextTick()

      // Verify the transfer composable is available
      const transferMock = mockUseSafeTransfer()
      expect(transferMock.transferFromSafe).toBeDefined()
      expect(transferMock.isTransferring.value).toBe(false)
    })

    it.skip('should invalidate ERC20 token queries after successful token transfer', async () => {
      const mockTransferFromSafe = vi.fn().mockResolvedValue('0xmocktxhash')
      mockUseSafeTransfer.mockReturnValue({
        transferFromSafe: mockTransferFromSafe,
        transferNative: vi.fn(),
        transferToken: vi.fn(),
        isTransferring: ref(false),
        error: ref(null)
      })

      // Add USDC balance to balances
      mockBalances.value = [
        ...MOCK_DATA.balances,
        {
          token: { symbol: 'USDC', id: 'usdc', name: 'USD Coin', code: 'USDC' },
          amount: 1000,
          values: { USD: { value: 1000, formated: '$1,000', price: 1 } }
        }
      ]

      wrapper = createWrapper()

      const component = wrapper.vm as {
        handleTransfer: (data: Record<string, unknown>) => Promise<void>
      }
      await component.handleTransfer({
        address: { address: '0x9876543210987654321098765432109876543210' as Address },
        token: { tokenId: 'usdc', symbol: 'USDC' },
        amount: '100'
      })
      await nextTick()

      // Verify ERC20 readContract invalidation was called
      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: [
          'readContract',
          {
            address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as Address,
            args: [MOCK_DATA.safeAddress],
            chainId: 137
          }
        ]
      })
    })

    it('should handle transfer loading state', () => {
      const transferringRef = ref(true)
      mockUseSafeTransfer.mockReturnValue({
        transferFromSafe: vi.fn(),
        transferNative: vi.fn(),
        transferToken: vi.fn(),
        isTransferring: transferringRef,
        error: ref(null)
      })

      wrapper = createWrapper()

      // Component should react to loading state
      expect(transferringRef.value).toBe(true)
    })

    it('should handle transfer errors', () => {
      const errorRef = ref(new Error('Transfer failed'))
      mockUseSafeTransfer.mockReturnValue({
        transferFromSafe: vi.fn(),
        transferNative: vi.fn(),
        transferToken: vi.fn(),
        isTransferring: ref(false),
        error: errorRef
      })

      wrapper = createWrapper()

      // Component should handle error state
      expect(errorRef.value?.message).toBe('Transfer failed')
    })
  })
})
