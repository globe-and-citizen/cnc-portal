import { describe, expect, it, vi } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import CashRemunerationView from '@/views/team/[id]/CashRemunerationView.vue'
import { createTestingPinia } from '@pinia/testing'
import { ref } from 'vue'
import { parseEther } from 'viem'
import { mockTeamStore } from '@/tests/mocks/store.mock'

vi.mock('@/stores/useToastStore')
vi.mock('vue-router', async (importOriginal) => {
  const original: object = await importOriginal()
  return {
    ...original,
    useRoute: vi.fn(() => ({
      params: {
        id: '1'
      }
    })),
    useRouter: vi.fn(() => ({
      push: vi.fn()
    }))
  }
})
vi.mock('@/composables/useClaim', () => {
  return {
    useSignWageClaim: vi.fn(() => ({
      execute: vi.fn(),
      isLoading: ref(false),
      signature: ref(undefined)
    })),
    useWithdrawClaim: vi.fn(() => ({
      execute: vi.fn(),
      isLoading: ref(false),
      isSuccess: ref(false),
      error: ref(undefined)
    }))
  }
})

vi.mock('@/stores', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    useTeamStore: vi.fn(() => mockTeamStore),
    useToastStore: vi.fn(() => ({ addErrorToast: vi.fn() }))
  }
})

const mockUseBalance = {
  data: ref({
    decimals: 18,
    formatted: `100`,
    symbol: `SepoliaETH`,
    value: parseEther(`100`)
  }),
  refetch: vi.fn(),
  error: ref<Error | null>(null),
  isLoading: ref(false)
}

const mockUseReadContract = {
  data: ref(BigInt(20000 * 1e6)),
  refetch: vi.fn(),
  error: ref<Error | null>(null),
  isLoading: ref(false)
}

vi.mock('@wagmi/vue', async (importOriginal) => {
  const original: object = await importOriginal()
  return {
    ...original,
    useBalance: vi.fn(() => ({ ...mockUseBalance })),
    useReadContract: vi.fn(() => ({ ...mockUseReadContract })),
    useChainId: vi.fn(() => ref(1))
  }
})

describe.skip('CashRemunerationView.vue', () => {
  const createComponent = () => {
    return shallowMount(CashRemunerationView, {
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })]
      }
    })
  }

  it('should pass correct props to GenericTokenHoldingsSection', () => {
    const wrapper = createComponent()
    const genericTokenHoldingSection = wrapper.findComponent({
      name: 'GenericTokenHoldingsSection'
    })

    expect(genericTokenHoldingSection.exists()).toBeTruthy()
    expect(genericTokenHoldingSection.props('address')).toBe('0x123')
  })

  it('should display contract address correctly', () => {
    const wrapper = createComponent()
    const addressTooltip = wrapper.findComponent({ name: 'AddressToolTip' })

    expect(addressTooltip.exists()).toBeTruthy()
    expect(addressTooltip.props('address')).toBe('0x123')
  })

  it('should render CashRemunerationOverview component', () => {
    const wrapper = createComponent()
    const overview = wrapper.findComponent({ name: 'CashRemunerationOverview' })

    expect(overview.exists()).toBeTruthy()
  })

  it.skip('should render CashRemunerationTable with correct owner address', () => {
    const wrapper = createComponent()
    const table = wrapper.findComponent({ name: 'CashRemunerationTable' })

    expect(table.exists()).toBeTruthy()
  })

  it.skip('should render CashRemunerationTransactions component', () => {
    const wrapper = createComponent()
    const transactions = wrapper.findComponent({ name: 'CashRemunerationTransactions' })

    expect(transactions.exists()).toBeTruthy()
  })

  it('should not render GenericTokenHoldingsSection when contract is not found', () => {
    mockTeamStore.currentTeam.teamContracts = []
    const wrapper = createComponent()
    const genericTokenHoldingSection = wrapper.findComponent({
      name: 'GenericTokenHoldingsSection'
    })

    expect(genericTokenHoldingSection.exists()).toBeFalsy()
  })
})
