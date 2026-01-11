import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { nextTick, ref, reactive, defineComponent } from 'vue'
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

// Define interfaces for type safety
interface MockSafeInfo {
  address: Address
  chain: string
  balance: string
  symbol: string
  owners: Address[]
  threshold: number
  totals?: {
    USD?: {
      value: number
      formated: string
      id: string
      code: string
      symbol: string
      price: number
      formatedPrice: string
    }
    EUR?: {
      value: number
      formated: string
      id: string
      code: string
      symbol: string
      price: number
      formatedPrice: string
    }
  }
}

interface MockTeam {
  safeAddress?: Address
  id: string
  name: string
}

interface MockCurrency {
  code: string
  name: string
  symbol: string
}

// Shared mocks
const mockUseSafeContract = {
  useSafeInfo: vi.fn()
}
const mockUseSafeAppUrls = {
  getSafeHomeUrl: vi.fn(),
  openSafeAppUrl: vi.fn()
}
const mockTeamStore = reactive({
  currentTeam: null as MockTeam | null
})
const mockUseChainId = ref(137) // Polygon
const mockUseStorage = ref<MockCurrency | null>(null)

// Mock Safe info responses with proper typing
const mockSafeInfo = ref<MockSafeInfo | null>(null)
const mockIsLoading = ref(false)
const mockError = ref<string | null>(null)
const mockFetchSafeInfo = vi.fn()

// Mock external dependencies
vi.mock('@/composables/safe', () => ({
  useSafeContract: vi.fn(() => mockUseSafeContract),
  useSafeAppUrls: vi.fn(() => mockUseSafeAppUrls)
}))

vi.mock('@wagmi/vue', () => ({
  useChainId: vi.fn(() => mockUseChainId)
}))

vi.mock('@vueuse/core', () => ({
  useStorage: vi.fn(() => mockUseStorage)
}))

vi.mock('@/stores', () => ({
  useTeamStore: vi.fn(() => mockTeamStore)
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
  } as MockSafeInfo,
  defaultCurrency: {
    code: 'USD',
    name: 'US Dollar',
    symbol: '$'
  } as MockCurrency,
  team: {
    safeAddress: '0x1234567890123456789012345678901234567890' as Address,
    id: '1',
    name: 'Test Team'
  } as MockTeam
} as const

// Component stubs with proper typing
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

describe('SafeBalanceSection', () => {
  let wrapper: VueWrapper<InstanceType<typeof SafeBalanceSection>>

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
    
    // Reset mock implementations
    mockUseSafeContract.useSafeInfo.mockReturnValue({
      safeInfo: mockSafeInfo,
      isLoading: mockIsLoading,
      error: mockError,
      fetchSafeInfo: mockFetchSafeInfo
    })
    
    mockUseSafeAppUrls.getSafeHomeUrl.mockReturnValue('https://app.safe.global/home?safe=polygon:0x1234567890123456789012345678901234567890')
    mockUseSafeAppUrls.openSafeAppUrl.mockImplementation(() => {})
    
    // Reset reactive values with proper typing
    mockSafeInfo.value = null
    mockIsLoading.value = false
    mockError.value = null
    mockUseChainId.value = 137
    mockUseStorage.value = MOCK_DATA.defaultCurrency
    mockTeamStore.currentTeam = MOCK_DATA.team
  })

  afterEach(() => {
    if (wrapper) wrapper.unmount()
  })

  describe('Component Rendering', () => {
    it('should render correctly with default state', () => {
      wrapper = createWrapper()
      
      expect(wrapper.find('[data-test="card-component"]').exists()).toBe(true)
      expect(wrapper.find('[data-test="open-safe-app-button"]').exists()).toBe(true)
      expect(wrapper.find('[data-test="address-tooltip"]').exists()).toBe(true)
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
      mockUseStorage.value = { code: 'EUR', name: 'Euro', symbol: '€' }
      wrapper = createWrapper()
      await nextTick()
      
      expect(wrapper.text()).toContain('€2.7K EUR')
    })

    it('should fallback to raw balance when totals not available', async () => {
      const safeInfoWithoutTotals: MockSafeInfo = {
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
      expect(wrapper.text()).toContain('Safe Address:')
    })

    it('should hide address section when no Safe address', async () => {
      mockTeamStore.currentTeam = { ...MOCK_DATA.team, safeAddress: undefined }
      wrapper = createWrapper()
      await nextTick()
      
      expect(wrapper.find('[data-test="address-tooltip"]').exists()).toBe(false)
    })
  })

  describe('Safe App Integration', () => {
    it('should open Safe app when button is clicked', async () => {
      wrapper = createWrapper()
      
      await wrapper.find('[data-test="open-safe-app-button"]').trigger('click')
      
      expect(mockUseSafeAppUrls.getSafeHomeUrl).toHaveBeenCalledWith(137, MOCK_DATA.safeAddress)
      expect(mockUseSafeAppUrls.openSafeAppUrl).toHaveBeenCalledWith(
        'https://app.safe.global/home?safe=polygon:0x1234567890123456789012345678901234567890'
      )
    })

    it('should not render Safe app button when no Safe address', async () => {
      mockTeamStore.currentTeam = { ...MOCK_DATA.team, safeAddress: undefined }
      wrapper = createWrapper()
      await nextTick()
      
      expect(wrapper.find('[data-test="open-safe-app-button"]').exists()).toBe(false)
    })

    it('should update Safe app URL when chain changes', async () => {
      wrapper = createWrapper()
      
      mockUseChainId.value = 11155111 // Sepolia
      await nextTick()
      
      await wrapper.find('[data-test="open-safe-app-button"]').trigger('click')
      
      expect(mockUseSafeAppUrls.getSafeHomeUrl).toHaveBeenCalledWith(11155111, MOCK_DATA.safeAddress)
    })
  })

  describe('Data Fetching', () => {
    it('should fetch Safe info on mount when Safe address exists', () => {
      wrapper = createWrapper()
      
      expect(mockFetchSafeInfo).toHaveBeenCalledTimes(1)
    })

    it('should not fetch Safe info on mount when no Safe address', () => {
      mockTeamStore.currentTeam = { ...MOCK_DATA.team, safeAddress: undefined }
      wrapper = createWrapper()
      
      expect(mockFetchSafeInfo).not.toHaveBeenCalled()
    })

    it('should refetch Safe info when Safe address changes', async () => {
      wrapper = createWrapper()
      expect(mockFetchSafeInfo).toHaveBeenCalledTimes(1)
      
      // Simulate Safe address change
      mockTeamStore.currentTeam = {
        ...MOCK_DATA.team,
        safeAddress: '0x9999999999999999999999999999999999999999' as Address
      }
      await nextTick()
      
      expect(mockFetchSafeInfo).toHaveBeenCalledTimes(2)
    })

    it('should refetch Safe info when chain changes', async () => {
      wrapper = createWrapper()
      expect(mockFetchSafeInfo).toHaveBeenCalledTimes(1)
      
      mockUseChainId.value = 11155111 // Change to Sepolia
      await nextTick()
      
      expect(mockFetchSafeInfo).toHaveBeenCalledTimes(2)
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
      mockUseStorage.value = { code: 'EUR', name: 'Euro', symbol: '€' }
      wrapper = createWrapper()
      await nextTick()
      
      expect(wrapper.text()).toContain('€2.7K EUR')
    })

    it('should fallback to USD when preferred currency not available', async () => {
      const safeInfoWithLimitedTotals: MockSafeInfo = {
        ...MOCK_DATA.safeInfo,
        totals: {
          USD: MOCK_DATA.safeInfo.totals!.USD
          // EUR not available
        }
      }
      mockSafeInfo.value = safeInfoWithLimitedTotals
      mockUseStorage.value = { code: 'EUR', name: 'Euro', symbol: '€' }
      wrapper = createWrapper()
      await nextTick()
      
      expect(wrapper.text()).toContain('$3K EUR') // Shows USD value with EUR label
    })

    it('should fallback to raw balance when no totals available', async () => {
      const safeInfoWithoutTotals: MockSafeInfo = {
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
      const updatedSafeInfo: MockSafeInfo = {
        ...MOCK_DATA.safeInfo,
        totals: {
          ...MOCK_DATA.safeInfo.totals!,
          USD: {
            ...MOCK_DATA.safeInfo.totals!.USD!,
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
      const updatedSafeInfo: MockSafeInfo = {
        ...MOCK_DATA.safeInfo,
        threshold: 1,
        owners: [MOCK_DATA.safeInfo.owners[0]] // Remove one owner
      }
      mockSafeInfo.value = updatedSafeInfo
      await nextTick()
      
      expect(wrapper.text()).toContain('1 of 1 signatures required')
    })
  })

  describe('Accessibility', () => {
    it('should have proper button attributes', () => {
      wrapper = createWrapper()
      
      const button = wrapper.find('[data-test="open-safe-app-button"]')
      expect(button.exists()).toBe(true)
    })

    it('should provide clear visual hierarchy', () => {
      mockSafeInfo.value = MOCK_DATA.safeInfo
      wrapper = createWrapper()
      
      // Check for proper text content organization
      expect(wrapper.text()).toContain('USD')
      expect(wrapper.text()).toContain('Safe Balance')
      expect(wrapper.text()).toContain('signatures required')
      expect(wrapper.text()).toContain('Safe Address:')
    })
  })

  describe('Edge Cases', () => {
    it('should handle very large balance numbers', async () => {
      const safeInfoWithLargeBalance: MockSafeInfo = {
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
      const safeInfoWithZeroBalance: MockSafeInfo = {
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
      const safeInfoWithNoOwners: MockSafeInfo = {
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
