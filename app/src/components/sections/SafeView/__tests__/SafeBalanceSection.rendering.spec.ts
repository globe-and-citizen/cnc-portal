import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { nextTick, ref, defineComponent } from 'vue'
import { useStorage } from '@vueuse/core'
import type { Address } from 'viem'
import SafeBalanceSection from '../SafeBalanceSection.vue'
import { mockUseContractBalance, mockUseAccount } from '@/tests/mocks'

// Mock @iconify/vue
vi.mock('@iconify/vue', () => ({
  Icon: {
    name: 'Icon',
    template: '<span></span>',
    props: ['icon']
  }
}))

// Hoisted mock variables
const {
  mockGetSafeHomeUrl,
  mockOpenSafeAppUrl,
  mockUseChainId,
  mockUseTeamStore,
  mockUseCurrencyStore,
  mockUseUserDataStore,

  mockuseGetSafeInfoQuery,
  mockQueryClient,
  mockUseSafeTransfer
} = vi.hoisted(() => ({
  mockGetSafeHomeUrl: vi.fn(),
  mockOpenSafeAppUrl: vi.fn(),
  mockUseChainId: vi.fn(),
  mockUseTeamStore: vi.fn(),
  mockUseCurrencyStore: vi.fn(),
  mockUseUserDataStore: vi.fn(),
  mockuseGetSafeInfoQuery: vi.fn(),
  mockQueryClient: {
    invalidateQueries: vi.fn()
  },
  // Add the missing useSafeTransfer mock
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

vi.mock('@tanstack/vue-query', () => ({
  useQueryClient: () => mockQueryClient
}))

// Test constants
const MOCK_DATA = {
  safeAddress: '0x1234567890123456789012345678901234567890' as Address,
  safeInfo: {
    owners: [
      '0x1111111111111111111111111111111111111111' as Address,
      '0x2222222222222222222222222222222222222222' as Address
    ],
    threshold: 2
  },
  balances: [
    {
      token: {
        symbol: 'ETH',
        id: 'ethereum',
        name: 'Ethereum',
        code: 'ETH'
      },
      amount: 1.5,
      values: {
        USD: {
          value: 3000,
          formated: '$3,000',
          price: 2000
        }
      }
    },
    {
      token: {
        symbol: 'SHER',
        id: 'sher',
        name: 'Sherlock',
        code: 'SHER'
      },
      amount: 100,
      values: {
        USD: {
          value: 500,
          formated: '$500',
          price: 5
        }
      }
    }
  ],
  total: {
    USD: {
      value: 4500,
      formated: '$4,500',
      price: 1
    }
  },
  defaultCurrency: {
    code: 'USD',
    name: 'US Dollar',
    symbol: '$'
  },
  team: {
    safeAddress: '0x1234567890123456789012345678901234567890' as Address,
    id: '1',
    name: 'Test Team'
  },
  teamMeta: {
    data: {
      safeAddress: '0x1234567890123456789012345678901234567890' as Address
    }
  }
} as const

const AddressToolTipStub = defineComponent({
  template: '<div data-test="address-tooltip"></div>'
})

const TransferFormStub = defineComponent({
  template: '<div data-test="transfer-form"><slot name="header" /></div>'
})

interface SafeBalanceSectionInstance {
  closeDepositModal: () => Promise<void>
  resetTransferValues: () => Promise<void>
  tokens: Array<{ symbol: string; price: number; tokenId: string }>
  transferData: { token: { symbol: string; tokenId: string } }
}

describe('SafeBalanceSection', () => {
  let wrapper: VueWrapper
  const mockCurrency = ref(MOCK_DATA.defaultCurrency)
  const mockSafeInfo = ref(MOCK_DATA.safeInfo)

  const createWrapper = (props = {}) =>
    mount(SafeBalanceSection, {
      props,
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

    mockUseChainId.mockReturnValue(ref(137))
    mockUseTeamStore.mockReturnValue({
      currentTeam: MOCK_DATA.team,
      currentTeamMeta: MOCK_DATA.teamMeta
    })

    mockUseCurrencyStore.mockReturnValue({
      currency: mockCurrency
    })

    mockUseUserDataStore.mockReturnValue({
      address: ref('0x1234567890123456789012345678901234567890')
    })

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

  describe('Component Rendering', () => {
    it('should show loading spinner when isLoading is true', () => {
      mockUseContractBalance.isLoading.value = true
      wrapper = createWrapper()

      expect(wrapper.find('[data-test="safe-balance-loading"]').exists()).toBe(true)
    })

    it('should show fallback values when safeInfo is null', () => {
      mockSafeInfo.value = null
      wrapper = createWrapper()

      expect(wrapper.text()).toContain('-')
      expect(wrapper.text()).toContain('0')
    })

  })

  describe('Tokens Computation', () => {
    it('should handle missing USD price gracefully', () => {
      mockUseContractBalance.balances.value = [
        {
          token: {
            symbol: 'TEST',
            id: 'test',
            name: 'Test Token',
            code: 'TEST'
          },
          amount: 100,
          values: {
            USD: undefined
          }
        }
      ] as typeof mockUseContractBalance.balances.value
      wrapper = createWrapper()

      const tokens = (wrapper.vm as SafeBalanceSectionInstance).tokens
      expect(tokens[0].price).toBe(0)
    })
  })

  describe('Transfer Modal', () => {
    it('should disable transfer button for non-owner', async () => {
      mockUseAccount.address.value = '0x9999999999999999999999999999999999999999'
      wrapper = createWrapper()

      const transferButton = wrapper.find('[data-test="transfer-button"]')
      expect(transferButton.attributes('disabled')).toBeDefined()

      await transferButton.trigger('click')
      await nextTick()

      expect(wrapper.find('[data-test="transfer-modal"]').exists()).toBe(false)
    })

    it('should handle empty tokens list gracefully', async () => {
      mockUseContractBalance.balances.value = [] as typeof mockUseContractBalance.balances.value
      wrapper = createWrapper()

      await wrapper.find('[data-test="transfer-button"]').trigger('click')
      await nextTick()

      const transferData = (wrapper.vm as unknown as SafeBalanceSectionInstance).transferData
      expect(transferData.token.symbol).toBe('')
    })
  })
})
