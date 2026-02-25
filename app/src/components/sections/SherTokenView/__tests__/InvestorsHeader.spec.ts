import { mount } from '@vue/test-utils'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { ref, nextTick } from 'vue'
import { createTestingPinia } from '@pinia/testing'
import InvestorsHeader from '../InvestorsHeader.vue'
import { parseUnits } from 'viem'
import { useTeamStore, useToastStore, useUserDataStore } from '@/stores'
import { useReadContractFn, mockToastStore } from '@/tests/mocks'

const localMockTeamStore = {
  currentTeam: null as ReturnType<typeof ref> | null,
  getContractAddressByType: vi.fn(() => '0xContract123')
}

const localMockUserStore = {
  address: null as ReturnType<typeof ref> | null
}

const { mockLog } = vi.hoisted(() => ({
  mockLog: { error: vi.fn() }
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
    localMockTeamStore.currentTeam = ref({
      id: 1,
      name: 'Test Team',
      ownerAddress: '0x123'
    })
    localMockUserStore.address = ref('0xUser123')

    vi.mocked(useTeamStore).mockReturnValue(localMockTeamStore as ReturnType<typeof useTeamStore>)
    vi.mocked(useUserDataStore).mockReturnValue(
      localMockUserStore as ReturnType<typeof useUserDataStore>
    )
    vi.mocked(useToastStore).mockReturnValue(mockToastStore as ReturnType<typeof useToastStore>)

    // Setup default mock return values
    useReadContractFn.mockImplementation(({ functionName }: { functionName: string }) => {
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
      expect(balanceCard.find(SELECTORS.subtitle).text()).toBe('Your Balance')
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
      if (localMockTeamStore.currentTeam) {
        localMockTeamStore.currentTeam.value = null
      }
      wrapper = createComponent()

      const overviewCards = wrapper.findAll(SELECTORS.overviewCards)
      expect(overviewCards).toHaveLength(3)
    })

    it('should show dots when token symbol is not available', () => {
      useReadContractFn.mockImplementation(({ functionName }: { functionName: string }) => {
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
      useReadContractFn.mockImplementation(({ functionName }: { functionName: string }) => {
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
      useReadContractFn.mockImplementation(({ functionName }: { functionName: string }) => {
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
      useReadContractFn.mockImplementation(({ functionName }: { functionName: string }) => {
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
      useReadContractFn.mockImplementation(({ functionName }: { functionName: string }) => {
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
      useReadContractFn.mockImplementation(({ functionName }: { functionName: string }) => {
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
      useReadContractFn.mockImplementation(({ functionName }: { functionName: string }) => {
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

      expect(useReadContractFn).toHaveBeenCalledWith({
        abi: expect.any(Array),
        address: expect.any(Object), // computed ref
        functionName: 'symbol'
      })
    })
  })
})
