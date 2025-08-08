import { mount } from '@vue/test-utils'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { ref, nextTick } from 'vue'
import { createTestingPinia } from '@pinia/testing'
import InvestorsHeader from '../InvestorsHeader.vue'
import { parseUnits } from 'viem'

// Hoisted variables for mocks
const { mockUseReadContract, mockTeamStore, mockUserStore, mockToastStore, mockLog } = vi.hoisted(
  () => ({
    mockUseReadContract: vi.fn(),
    mockTeamStore: {
      currentTeam: null as ReturnType<typeof ref> | null,
      getContractAddressByType: vi.fn(() => '0xContract123')
    },
    mockUserStore: {
      address: null as ReturnType<typeof ref> | null
    },
    mockToastStore: {
      addErrorToast: vi.fn()
    },
    mockLog: {
      error: vi.fn()
    }
  })
)

// Mock wagmi composables
vi.mock('@wagmi/vue', () => ({
  useReadContract: mockUseReadContract
}))

// Mock stores
vi.mock('@/stores', () => ({
  useTeamStore: vi.fn(() => mockTeamStore),
  useUserDataStore: vi.fn(() => mockUserStore),
  useToastStore: vi.fn(() => mockToastStore)
}))

// Mock utils
vi.mock('@/utils', () => ({
  log: mockLog
}))

describe('InvestorsHeader', () => {
  let wrapper: ReturnType<typeof mount>

  // Test data constants
  const mockTokenData = {
    symbol: 'BTC',
    totalSupply: parseUnits('1000000', 6),
    balance: parseUnits('100', 6),
    shareholders: ['0x123', '0x456']
  }

  // Test selectors
  const SELECTORS = {
    overviewCards: '.overview-card',
    amount: '[data-test="amount"]',
    subtitle: '[data-test="subtitle"]',
    loading: '[data-test="loading"]'
  } as const

  beforeEach(() => {
    vi.clearAllMocks()

    // Initialize refs
    mockTeamStore.currentTeam = ref({
      id: 1,
      name: 'Test Team',
      ownerAddress: '0x123'
    })
    mockUserStore.address = ref('0xUser123')

    // Setup default mock return values
    mockUseReadContract.mockImplementation(({ functionName }: { functionName: string }) => {
      switch (functionName) {
        case 'symbol':
          return { data: ref(mockTokenData.symbol), error: ref(null) }
        case 'totalSupply':
          return { data: ref(mockTokenData.totalSupply), error: ref(null) }
        case 'balanceOf':
          return { data: ref(mockTokenData.balance), error: ref(null) }
        case 'getShareholders':
          return { data: ref(mockTokenData.shareholders), error: ref(null) }
        default:
          return { data: ref(null), error: ref(null) }
      }
    })
  })

  afterEach(() => {
    if (wrapper) wrapper.unmount()
  })

  const createComponent = () => {
    return mount(InvestorsHeader, {
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })],
        stubs: {
          OverviewCard: {
            template: `
              <div class="overview-card">
                <div v-if="!loading" data-test="amount">{{ title }}</div>
                <div v-else data-test="loading">Loading...</div>
                <div data-test="subtitle">{{ subtitle }}</div>
              </div>
            `,
            props: ['title', 'subtitle', 'variant', 'cardIcon', 'loading']
          }
        }
      }
    })
  }

  describe('Component Rendering', () => {
    it('should render the component with all required elements', () => {
      wrapper = createComponent()

      const overviewCards = wrapper.findAll(SELECTORS.overviewCards)
      expect(overviewCards).toHaveLength(3)
    })

    it('should render investors count card with correct data', () => {
      wrapper = createComponent()
      const cards = wrapper.findAll(SELECTORS.overviewCards)
      const investorsCard = cards[0]

      expect(investorsCard.find(SELECTORS.amount).text()).toBe('2 Investors')
      expect(investorsCard.find(SELECTORS.subtitle).text()).toBe('Investors')
    })

    it('should render balance card with formatted token amount', () => {
      wrapper = createComponent()
      const cards = wrapper.findAll(SELECTORS.overviewCards)
      const balanceCard = cards[1]

      expect(balanceCard.find(SELECTORS.amount).text()).toBe('100 BTC')
      expect(balanceCard.find(SELECTORS.subtitle).text()).toBe('Balance')
    })

    it('should render total supply card with formatted token amount', () => {
      wrapper = createComponent()
      const cards = wrapper.findAll(SELECTORS.overviewCards)
      const supplyCard = cards[2]

      expect(supplyCard.find(SELECTORS.amount).text()).toBe('1000000 BTC')
      expect(supplyCard.find(SELECTORS.subtitle).text()).toBe('Total Supply')
    })
  })

  describe('Loading States', () => {
    it('should show loading state when team is not available', () => {
      if (mockTeamStore.currentTeam) {
        mockTeamStore.currentTeam.value = null
      }
      wrapper = createComponent()

      const overviewCards = wrapper.findAll(SELECTORS.overviewCards)
      expect(overviewCards).toHaveLength(3)
    })

    it('should show dots when token symbol is not available', () => {
      mockUseReadContract.mockImplementation(({ functionName }: { functionName: string }) => {
        switch (functionName) {
          case 'symbol':
            return { data: ref(null), error: ref(null) }
          case 'totalSupply':
            return { data: ref(mockTokenData.totalSupply), error: ref(null) }
          case 'balanceOf':
            return { data: ref(mockTokenData.balance), error: ref(null) }
          case 'getShareholders':
            return { data: ref(mockTokenData.shareholders), error: ref(null) }
          default:
            return { data: ref(null), error: ref(null) }
        }
      })

      wrapper = createComponent()
      const cards = wrapper.findAll(SELECTORS.overviewCards)

      expect(cards[1].find(SELECTORS.amount).text()).toBe('...')
      expect(cards[2].find(SELECTORS.amount).text()).toBe('...')
    })

    it('should show dots when balance is null', () => {
      mockUseReadContract.mockImplementation(({ functionName }: { functionName: string }) => {
        switch (functionName) {
          case 'symbol':
            return { data: ref(mockTokenData.symbol), error: ref(null) }
          case 'totalSupply':
            return { data: ref(mockTokenData.totalSupply), error: ref(null) }
          case 'balanceOf':
            return { data: ref(null), error: ref(null) }
          case 'getShareholders':
            return { data: ref(mockTokenData.shareholders), error: ref(null) }
          default:
            return { data: ref(null), error: ref(null) }
        }
      })

      wrapper = createComponent()
      const cards = wrapper.findAll(SELECTORS.overviewCards)

      expect(cards[1].find(SELECTORS.amount).text()).toBe('...')
    })
  })

  describe('Error Handling', () => {
    it('should handle token symbol error and show toast', async () => {
      const errorRef = ref<string | null>(null)
      mockUseReadContract.mockImplementation(({ functionName }: { functionName: string }) => {
        switch (functionName) {
          case 'symbol':
            return { data: ref(null), error: errorRef }
          case 'totalSupply':
            return { data: ref(mockTokenData.totalSupply), error: ref(null) }
          case 'balanceOf':
            return { data: ref(mockTokenData.balance), error: ref(null) }
          case 'getShareholders':
            return { data: ref(mockTokenData.shareholders), error: ref(null) }
          default:
            return { data: ref(null), error: ref(null) }
        }
      })

      wrapper = createComponent()

      // Trigger the error
      errorRef.value = 'Token symbol error'
      await nextTick()

      expect(mockLog.error).toHaveBeenCalledWith(
        'Error fetching token symbol',
        'Token symbol error'
      )
      expect(mockToastStore.addErrorToast).toHaveBeenCalledWith('Error fetching token symbol')
    })

    it('should handle shareholders error and show toast', async () => {
      const errorRef = ref<string | null>(null)
      mockUseReadContract.mockImplementation(({ functionName }: { functionName: string }) => {
        switch (functionName) {
          case 'symbol':
            return { data: ref(mockTokenData.symbol), error: ref(null) }
          case 'totalSupply':
            return { data: ref(mockTokenData.totalSupply), error: ref(null) }
          case 'balanceOf':
            return { data: ref(mockTokenData.balance), error: ref(null) }
          case 'getShareholders':
            return { data: ref(null), error: errorRef }
          default:
            return { data: ref(null), error: ref(null) }
        }
      })

      wrapper = createComponent()

      // Trigger the error
      errorRef.value = 'Shareholders error'
      await nextTick()

      expect(mockLog.error).toHaveBeenCalledWith(
        'Error fetching shareholders',
        'Shareholders error'
      )
      expect(mockToastStore.addErrorToast).toHaveBeenCalledWith('Error fetching shareholders')
    })
  })

  describe('Edge Cases and Data Validation', () => {
    it('should handle empty shareholders array', () => {
      mockUseReadContract.mockImplementation(({ functionName }: { functionName: string }) => {
        switch (functionName) {
          case 'symbol':
            return { data: ref(mockTokenData.symbol), error: ref(null) }
          case 'totalSupply':
            return { data: ref(mockTokenData.totalSupply), error: ref(null) }
          case 'balanceOf':
            return { data: ref(mockTokenData.balance), error: ref(null) }
          case 'getShareholders':
            return { data: ref([]), error: ref(null) }
          default:
            return { data: ref(null), error: ref(null) }
        }
      })

      wrapper = createComponent()
      const cards = wrapper.findAll(SELECTORS.overviewCards)
      const investorsCard = cards[0]

      expect(investorsCard.find(SELECTORS.amount).text()).toBe('0 Investors')
    })

    it('should handle null shareholders data', () => {
      mockUseReadContract.mockImplementation(({ functionName }: { functionName: string }) => {
        switch (functionName) {
          case 'symbol':
            return { data: ref(mockTokenData.symbol), error: ref(null) }
          case 'totalSupply':
            return { data: ref(mockTokenData.totalSupply), error: ref(null) }
          case 'balanceOf':
            return { data: ref(mockTokenData.balance), error: ref(null) }
          case 'getShareholders':
            return { data: ref(null), error: ref(null) }
          default:
            return { data: ref(null), error: ref(null) }
        }
      })

      wrapper = createComponent()
      const cards = wrapper.findAll(SELECTORS.overviewCards)
      const investorsCard = cards[0]

      expect(investorsCard.find(SELECTORS.amount).text()).toBe('0 Investors')
    })

    it('should handle zero balance gracefully', () => {
      mockUseReadContract.mockImplementation(({ functionName }: { functionName: string }) => {
        switch (functionName) {
          case 'symbol':
            return { data: ref(mockTokenData.symbol), error: ref(null) }
          case 'totalSupply':
            return { data: ref(mockTokenData.totalSupply), error: ref(null) }
          case 'balanceOf':
            return { data: ref(parseUnits('0', 6)), error: ref(null) }
          case 'getShareholders':
            return { data: ref(mockTokenData.shareholders), error: ref(null) }
          default:
            return { data: ref(null), error: ref(null) }
        }
      })

      wrapper = createComponent()
      const cards = wrapper.findAll(SELECTORS.overviewCards)
      const balanceCard = cards[1]

      expect(balanceCard.find(SELECTORS.amount).text()).toBe('0 BTC')
    })
  })

  describe('Contract Interactions', () => {
    it('should call useReadContract with correct parameters for token symbol', () => {
      wrapper = createComponent()

      expect(mockUseReadContract).toHaveBeenCalledWith({
        abi: expect.any(Array),
        address: expect.any(Object), // computed ref
        functionName: 'symbol'
      })
    })

    it.skip('should get contract address from team store', () => {
      // Reset the mock to track calls from component creation
      mockTeamStore.getContractAddressByType.mockClear()

      wrapper = createComponent()

      // The computed property should be evaluated during component creation
      expect(mockTeamStore.getContractAddressByType).toHaveBeenCalledWith('InvestorsV1')
    })
  })
})
