import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { nextTick, ref, defineComponent } from 'vue'
import { useStorage } from '@vueuse/core'
import type { Address } from 'viem'
import SafeBalanceSection from '../SafeBalanceSection.vue'

// Mock @iconify/vue FIRST, before any other imports
vi.mock('@iconify/vue', () => ({
  Icon: {
    name: 'Icon',
    template: '<span></span>',
    props: ['icon']
  }
}))

// Hoisted mock variables
const {
  mockUseSafeData,
  mockGetSafeHomeUrl,
  mockOpenSafeAppUrl,
  mockUseChainId,
  mockUseTeamStore
} = vi.hoisted(() => ({
  mockUseSafeData: vi.fn(),
  mockGetSafeHomeUrl: vi.fn(),
  mockOpenSafeAppUrl: vi.fn(),
  mockUseChainId: vi.fn(),
  mockUseTeamStore: vi.fn()
}))

// Mock external dependencies
vi.mock('@/composables/safe', () => ({
  getSafeHomeUrl: mockGetSafeHomeUrl,
  openSafeAppUrl: mockOpenSafeAppUrl
}))

vi.mock('@wagmi/vue', () => ({
  useChainId: mockUseChainId
}))

vi.mock('@vueuse/core', () => ({
  useStorage: vi.fn()
}))

vi.mock('@/stores', () => ({
  useTeamStore: mockUseTeamStore
}))

// Test constants
const MOCK_DATA = {
  safeAddress: '0x1234567890123456789012345678901234567890' as Address,
  safeInfo: {
    address: '0x1234567890123456789012345678901234567890' as Address,
    chain: 'polygon',
    balance: '1.5',
    symbol: 'POL',
    owners: [
      '0x1111111111111111111111111111111111111111' as Address,
      '0x2222222222222222222222222222222222222222' as Address
    ],
    threshold: 2,
    totals: {
      USD: {
        value: 3000,
        formated: '$3K',
        id: 'usd',
        code: 'USD',
        symbol: '$',
        price: 2000,
        formatedPrice: '$2K'
      },
      EUR: {
        value: 2700,
        formated: '€2.7K',
        id: 'eur',
        code: 'EUR',
        symbol: '€',
        price: 1800,
        formatedPrice: '€1.8K'
      }
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
  }
} as const

// Component stubs
const CardStub = defineComponent({
  template: '<div data-test="card-component"><slot /></div>'
})

const ButtonStub = defineComponent({
  props: ['variant', 'class'],
  emits: ['click'],
  template: '<button data-test="button" @click="$emit(\'click\')"><slot /></button>'
})

const AddressToolTipStub = defineComponent({
  props: ['address'],
  template: '<div data-test="address-tooltip">{{ address }}</div>'
})

describe.skip('SafeBalanceSection', () => {
  let wrapper: VueWrapper
  const mockSafeInfo = ref(null)
  const mockIsLoading = ref(false)
  const mockError = ref(null)
  const mockRefetch = vi.fn()
  const mockCurrency = ref(MOCK_DATA.defaultCurrency)

  const createWrapper = () =>
    mount(SafeBalanceSection, {
      global: {
        stubs: {
          CardComponent: CardStub,
          ButtonUI: ButtonStub,
          AddressToolTip: AddressToolTipStub
        }
      }
    })

  beforeEach(() => {
    vi.clearAllMocks()

    // Setup default mocks
    mockUseSafeData.mockReturnValue({
      safeInfo: mockSafeInfo,
      isLoading: mockIsLoading,
      error: mockError,
      refetch: mockRefetch
    })

    mockUseChainId.mockReturnValue(ref(137))
    mockUseTeamStore.mockReturnValue({
      currentTeam: MOCK_DATA.team
    })

    vi.mocked(useStorage).mockReturnValue(mockCurrency as never)

    mockGetSafeHomeUrl.mockReturnValue(
      'https://app.safe.global/home?safe=polygon:0x1234567890123456789012345678901234567890'
    )
    mockOpenSafeAppUrl.mockImplementation(() => {})

    // Reset reactive values
    mockSafeInfo.value = null
    mockIsLoading.value = false
    mockError.value = null
  })

  afterEach(() => {
    if (wrapper) wrapper.unmount()
  })

  describe('Component Rendering', () => {
    it('should render correctly with default state', () => {
      wrapper = createWrapper()

      expect(wrapper.find('[data-test="card-component"]').exists()).toBe(true)
      expect(wrapper.find('[data-test="open-safe-app-button"]').exists()).toBe(true)
    })

    it('should display loading spinner when Safe info is loading', () => {
      mockIsLoading.value = true
      wrapper = createWrapper()

      expect(wrapper.find('[data-test="safe-balance-loading"]').exists()).toBe(true)
    })

    it('should display Safe balance when loaded', async () => {
      mockSafeInfo.value = MOCK_DATA.safeInfo
      wrapper = createWrapper()
      await nextTick()

      expect(wrapper.text()).toContain('$3K')
      expect(wrapper.text()).toContain('USD')
    })

    it('should display threshold and owner information', async () => {
      mockSafeInfo.value = MOCK_DATA.safeInfo
      wrapper = createWrapper()
      await nextTick()

      expect(wrapper.text()).toContain('2 of 2 signatures required')
      expect(wrapper.text()).toContain('Safe Balance')
    })

    it('should display fallback values when Safe info is not loaded', () => {
      wrapper = createWrapper()

      expect(wrapper.text()).toContain('- of 0 signatures required')
    })
  })

  describe('Balance Display', () => {
    it('should display USD balance when available', async () => {
      mockSafeInfo.value = MOCK_DATA.safeInfo
      wrapper = createWrapper()
      await nextTick()

      expect(wrapper.text()).toContain('$3K')
    })

    it('should display local currency when different from USD', async () => {
      mockSafeInfo.value = MOCK_DATA.safeInfo
      mockCurrency.value = { code: 'EUR', name: 'Euro', symbol: '€' }
      wrapper = createWrapper()
      await nextTick()

      expect(wrapper.text()).toContain('€2.7K EUR')
    })

    it('should fallback to raw balance when totals not available', async () => {
      const safeInfoWithoutTotals = {
        ...MOCK_DATA.safeInfo,
        totals: undefined
      }
      mockSafeInfo.value = safeInfoWithoutTotals
      wrapper = createWrapper()
      await nextTick()

      expect(wrapper.text()).toContain('1.5')
    })

    it('should display 0 when no balance data available', () => {
      mockSafeInfo.value = null
      wrapper = createWrapper()

      expect(wrapper.text()).toContain('0')
    })
  })

  describe('Safe Address Display', () => {
    it('should display Safe address when available', () => {
      wrapper = createWrapper()

      const tooltip = wrapper.find('[data-test="address-tooltip"]')
      expect(tooltip.exists()).toBe(true)
      expect(tooltip.text()).toContain(MOCK_DATA.safeAddress)
    })

    it('should hide address section when no Safe address', async () => {
      mockUseTeamStore.mockReturnValue({
        currentTeam: { ...MOCK_DATA.team, safeAddress: undefined }
      })
      wrapper = createWrapper()
      await nextTick()

      expect(wrapper.find('[data-test="address-tooltip"]').exists()).toBe(false)
    })
  })

  describe('Safe App Integration', () => {
    it('should open Safe app when button is clicked', async () => {
      wrapper = createWrapper()

      await wrapper.find('[data-test="open-safe-app-button"]').trigger('click')

      expect(mockGetSafeHomeUrl).toHaveBeenCalledWith(137, MOCK_DATA.safeAddress)
      expect(mockOpenSafeAppUrl).toHaveBeenCalledWith(
        'https://app.safe.global/home?safe=polygon:0x1234567890123456789012345678901234567890'
      )
    })

    it('should not render Safe app button when no Safe address', async () => {
      mockUseTeamStore.mockReturnValue({
        currentTeam: { ...MOCK_DATA.team, safeAddress: undefined }
      })
      wrapper = createWrapper()
      await nextTick()

      expect(wrapper.find('[data-test="open-safe-app-button"]').exists()).toBe(false)
    })
  })

  describe('Data Fetching', () => {
    it('should fetch Safe info on mount when Safe address exists', () => {
      wrapper = createWrapper()

      expect(mockRefetch).toHaveBeenCalledTimes(1)
    })

    it('should refetch Safe info when Safe address changes', async () => {
      wrapper = createWrapper()
      expect(mockRefetch).toHaveBeenCalledTimes(1)

      // Simulate Safe address change
      mockUseTeamStore.mockReturnValue({
        currentTeam: {
          ...MOCK_DATA.team,
          safeAddress: '0x9999999999999999999999999999999999999999' as Address
        }
      })
      await nextTick()

      // Component should react to store changes
      expect(mockRefetch).toHaveBeenCalled()
    })

    it('should refetch Safe info when chain changes', async () => {
      wrapper = createWrapper()

      mockUseChainId.mockReturnValue(ref(11155111)) // Change to Sepolia
      await nextTick()

      // Should trigger refetch
      expect(mockRefetch).toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    it('should log error to console when Safe info fetch fails', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      wrapper = createWrapper()

      mockError.value = 'Failed to fetch Safe info'
      await nextTick()

      expect(consoleErrorSpy).toHaveBeenCalledWith('Safe error:', 'Failed to fetch Safe info')

      consoleErrorSpy.mockRestore()
    })

    it('should handle missing Safe info gracefully', () => {
      mockSafeInfo.value = null
      mockError.value = 'Network error'

      wrapper = createWrapper()

      // Component should still render without crashing
      expect(wrapper.find('[data-test="card-component"]').exists()).toBe(true)
      expect(wrapper.text()).toContain('0') // Shows fallback balance
    })
  })

  describe('Loading States', () => {
    it('should show loading spinner during Safe info fetch', () => {
      mockIsLoading.value = true
      wrapper = createWrapper()

      expect(wrapper.find('[data-test="safe-balance-loading"]').exists()).toBe(true)
      expect(wrapper.find('.loading-spinner').exists()).toBe(true)
    })

    it('should hide loading spinner when fetch completes', async () => {
      mockIsLoading.value = true
      wrapper = createWrapper()

      expect(wrapper.find('[data-test="safe-balance-loading"]').exists()).toBe(true)

      mockIsLoading.value = false
      mockSafeInfo.value = MOCK_DATA.safeInfo
      await nextTick()

      expect(wrapper.find('[data-test="safe-balance-loading"]').exists()).toBe(false)
    })
  })

  describe('Currency Display', () => {
    it('should respect user currency preference', async () => {
      mockSafeInfo.value = MOCK_DATA.safeInfo
      mockCurrency.value = { code: 'EUR', name: 'Euro', symbol: '€' }
      wrapper = createWrapper()
      await nextTick()

      expect(wrapper.text()).toContain('€2.7K EUR')
    })

    it('should fallback to USD when preferred currency not available', async () => {
      const safeInfoWithLimitedTotals = {
        ...MOCK_DATA.safeInfo,
        totals: {
          USD: MOCK_DATA.safeInfo.totals.USD
          // EUR not available
        }
      }
      mockSafeInfo.value = safeInfoWithLimitedTotals
      mockCurrency.value = { code: 'EUR', name: 'Euro', symbol: '€' }
      wrapper = createWrapper()
      await nextTick()

      expect(wrapper.text()).toContain('$3K EUR') // Shows USD value with EUR label
    })

    it.skip('should fallback to raw balance when no totals available', async () => {
      const safeInfoWithoutTotals = {
        ...MOCK_DATA.safeInfo,
        totals: undefined
      }
      mockSafeInfo.value = safeInfoWithoutTotals
      wrapper = createWrapper()
      await nextTick()

      expect(wrapper.text()).toContain('1.5 USD') // Raw balance with currency code
    })
  })

  describe('Reactivity', () => {
    it('should update display when Safe info changes', async () => {
      mockSafeInfo.value = MOCK_DATA.safeInfo
      wrapper = createWrapper()
      await nextTick()

      expect(wrapper.text()).toContain('$3K')

      // Update Safe info
      const updatedSafeInfo = {
        ...MOCK_DATA.safeInfo,
        totals: {
          ...MOCK_DATA.safeInfo.totals,
          USD: {
            ...MOCK_DATA.safeInfo.totals.USD,
            formated: '$5K'
          }
        }
      }
      mockSafeInfo.value = updatedSafeInfo
      await nextTick()

      expect(wrapper.text()).toContain('$5K')
    })

    it('should update threshold display when Safe info changes', async () => {
      mockSafeInfo.value = MOCK_DATA.safeInfo
      wrapper = createWrapper()
      await nextTick()

      expect(wrapper.text()).toContain('2 of 2 signatures required')

      // Update threshold
      const updatedSafeInfo = {
        ...MOCK_DATA.safeInfo,
        threshold: 1,
        owners: [MOCK_DATA.safeInfo.owners[0]]
      }
      mockSafeInfo.value = updatedSafeInfo
      await nextTick()

      expect(wrapper.text()).toContain('1 of 1 signatures required')
    })
  })

  describe('Edge Cases', () => {
    it('should handle very large balance numbers', async () => {
      const safeInfoWithLargeBalance = {
        ...MOCK_DATA.safeInfo,
        balance: '999999999.123456789',
        totals: {
          USD: {
            value: 999999999,
            formated: '$999.9M',
            id: 'usd',
            code: 'USD',
            symbol: '$',
            price: 1,
            formatedPrice: '$1'
          }
        }
      }
      mockSafeInfo.value = safeInfoWithLargeBalance
      wrapper = createWrapper()
      await nextTick()

      expect(wrapper.text()).toContain('$999.9M')
    })

    it('should handle zero balance', async () => {
      const safeInfoWithZeroBalance = {
        ...MOCK_DATA.safeInfo,
        balance: '0',
        totals: {
          USD: {
            value: 0,
            formated: '$0',
            id: 'usd',
            code: 'USD',
            symbol: '$',
            price: 0,
            formatedPrice: '$0'
          }
        }
      }
      mockSafeInfo.value = safeInfoWithZeroBalance
      wrapper = createWrapper()
      await nextTick()

      expect(wrapper.text()).toContain('$0')
    })

    it('should handle empty owners array', async () => {
      const safeInfoWithNoOwners = {
        ...MOCK_DATA.safeInfo,
        owners: [],
        threshold: 0
      }
      mockSafeInfo.value = safeInfoWithNoOwners
      wrapper = createWrapper()
      await nextTick()

      expect(wrapper.text()).toContain('0 of 0 signatures required')
    })
  })
})
