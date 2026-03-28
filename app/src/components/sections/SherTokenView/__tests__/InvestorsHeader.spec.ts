import { mount } from '@vue/test-utils'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { createTestingPinia } from '@pinia/testing'
import InvestorsHeader from '../InvestorsHeader.vue'
import { parseUnits } from 'viem'
import { mockInvestorReads, mockTeamStore, mockUserStore, resetContractMocks } from '@/tests/mocks'

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
    resetContractMocks()
    vi.clearAllMocks()

    // Initialize store state
    mockTeamStore.currentTeam = {
      id: 1,
      name: 'Test Team',
      ownerAddress: '0x123'
    }
    mockUserStore.address = '0xUser123'

    mockInvestorReads.symbol.data.value = mockTokenData.symbol
    mockInvestorReads.totalSupply.data.value = mockTokenData.totalSupply
    mockInvestorReads.balanceOf.data.value = mockTokenData.balance
    mockInvestorReads.shareholders.data.value = mockTokenData.shareholders
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
      mockTeamStore.currentTeam = null
      wrapper = createComponent()

      const overviewCards = wrapper.findAll(SELECTORS.overviewCards)
      expect(overviewCards).toHaveLength(3)
    })

    it('should show dots when token symbol is not available', () => {
      mockInvestorReads.symbol.data.value = null

      wrapper = createComponent()
      const cards = wrapper.findAll(SELECTORS.overviewCards)

      expect(cards[1].find(SELECTORS.amount).text()).toBe('...')
      expect(cards[2].find(SELECTORS.amount).text()).toBe('...')
    })

    it('should show dots when balance is null', () => {
      mockInvestorReads.balanceOf.data.value = null

      wrapper = createComponent()
      const cards = wrapper.findAll(SELECTORS.overviewCards)

      expect(cards[1].find(SELECTORS.amount).text()).toBe('...')
    })
  })

  describe('Edge Cases and Data Validation', () => {
    it('should handle empty shareholders array', () => {
      mockInvestorReads.shareholders.data.value = []

      wrapper = createComponent()
      const cards = wrapper.findAll(SELECTORS.overviewCards)
      const investorsCard = cards[0]

      expect(investorsCard.find(SELECTORS.amount).text()).toBe('0 Investors')
    })

    it('should handle null shareholders data', () => {
      mockInvestorReads.shareholders.data.value = null

      wrapper = createComponent()
      const cards = wrapper.findAll(SELECTORS.overviewCards)
      const investorsCard = cards[0]

      expect(investorsCard.find(SELECTORS.amount).text()).toBe('0 Investors')
    })

    it('should handle zero balance gracefully', () => {
      mockInvestorReads.balanceOf.data.value = parseUnits('0', 6)

      wrapper = createComponent()
      const cards = wrapper.findAll(SELECTORS.overviewCards)
      const balanceCard = cards[1]

      expect(balanceCard.find(SELECTORS.amount).text()).toBe('0 BTC')
    })
  })
})
