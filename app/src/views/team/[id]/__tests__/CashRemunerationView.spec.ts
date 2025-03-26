import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import CashRemunerationView from '@/views/team/[id]/CashRemunerationView.vue'
import { createTestingPinia } from '@pinia/testing'
import { ref } from 'vue'
import { parseEther } from 'viem'

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
// Add mock for teamStore
const mockTeamStore = {
  currentTeam: {
    cashRemunerationEip712Address: '0x123',
    id: '1',
    name: 'Test Team'
  },
  setCurrentTeamId: vi.fn()
}

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
    return mount(CashRemunerationView, {
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
    expect(genericTokenHoldingSection.props('address')).toBe(
      mockTeamStore.currentTeam.cashRemunerationEip712Address
    )
  })
})
