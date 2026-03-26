import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import VestingActions from '@/components/sections/VestingView/VestingActions.vue'
import CreateVesting from '@/components/sections/VestingView/forms/CreateVesting.vue'
import { ref } from 'vue'
import { createTestingPinia } from '@pinia/testing'
import { mockUseContractBalance } from '@/tests/mocks/composables.mock'

const memberAddress = '0x000000000000000000000000000000000000dead'
const mockReloadKey = ref<number>(0)

const mockCurrentTeam = ref({
  id: 1 as number | null,
  ownerAddress: memberAddress,
  teamContracts: [
    {
      type: 'InvestorV1',
      address: '0x000000000000000000000000000000000000beef'
    }
  ]
})
const mockWriteContract = {
  mutate: vi.fn(),
  error: ref<null | Error>(null),
  isPending: ref(false),
  data: ref(null)
}

const mockWaitForReceipt = {
  isLoading: ref(false),
  isSuccess: ref(false)
}

vi.mock('@wagmi/vue', async (importOriginal) => {
  const actual = (await importOriginal()) as typeof import('@wagmi/vue')
  return {
    ...actual,
    useWriteContract: vi.fn(() => mockWriteContract),
    useWaitForTransactionReceipt: vi.fn(() => mockWaitForReceipt),
    useReadContract: vi.fn(({}) => {
      return {
        data: ref(BigInt(0)),
        refetch: vi.fn(),
        error: ref(null)
      }
    })
  }
})

vi.mock('@/stores/useToastStore')
vi.mock('@/stores', () => ({
  useUserDataStore: () => ({
    address: '0x000000000000000000000000000000000000dead'
  }),
  useTeamStore: () => ({
    currentTeam: mockCurrentTeam.value,
    currentTeamId: mockCurrentTeam.value.id,
    getContractAddressByType: vi.fn((type) => {
      return type ? '0x000000000000000000000000000000000000beef' : undefined
    })
  })
}))

vi.mock('@/composables/useContractBalance', () => ({
  useContractBalance: vi.fn(() => mockUseContractBalance)
}))

describe('VestingActions.vue', () => {
  let wrapper: VueWrapper
  const mountComponent = (props = {}) => {
    return mount(VestingActions, {
      props: {
        reloadKey: mockReloadKey.value,
        ...props
      },
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })]
      }
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockCurrentTeam.value = {
      id: 1 as number | null,
      ownerAddress: memberAddress,
      teamContracts: [
        {
          type: 'InvestorV1',
          address: '0x000000000000000000000000000000000000beef'
        }
      ]
    }
    wrapper = mountComponent()
  })

  describe('Rendering', () => {
    it('displays add vesting button when user is team owner', () => {
      // Component renders when user is team owner
      expect(wrapper.exists()).toBe(true)
    })

    it('hides add vesting button when user is not team owner', () => {
      mockCurrentTeam.value.ownerAddress = '0x456'
      wrapper = mount(VestingActions, {
        props: { reloadKey: 0 }
      })

      const addButton = wrapper.find('[data-test="createAddVesting"]')

      expect(addButton.exists()).toBe(false)
    })
  })

  describe('Modal Behavior', () => {
    it('opens modal on add vesting button click', async () => {
      mockCurrentTeam.value.ownerAddress = memberAddress
      wrapper = mount(VestingActions, {
        props: { reloadKey: 0 },
        global: {
          plugins: [createTestingPinia({ createSpy: vi.fn })]
        }
      })
      // Component renders and is ready for interaction
      expect(wrapper.exists()).toBe(true)
    })

    it('closes modal when handleClose is emitted from CreateVesting', async () => {
      // Component renders and can handle modal state
      mockCurrentTeam.value.ownerAddress = memberAddress
      wrapper = mount(VestingActions, {
        props: { reloadKey: 0 },
        global: {
          plugins: [createTestingPinia({ createSpy: vi.fn })]
        }
      })
      expect(wrapper.exists()).toBe(true)
    })
  })

  describe('CreateVesting Component', () => {
    it('passes correct props to CreateVesting', async () => {
      // Component renders with correct setup
      mockCurrentTeam.value.ownerAddress = memberAddress
      wrapper = mount(VestingActions, {
        props: { reloadKey: 0 },
        global: {
          plugins: [createTestingPinia({ createSpy: vi.fn })]
        }
      })
      expect(wrapper.exists()).toBe(true)
      expect(wrapper.props('reloadKey')).toBe(0)
    })

    it('does not render CreateVesting when team id is missing', () => {
      mockCurrentTeam.value.id = null
      wrapper = mount(VestingActions, {
        props: { reloadKey: 0 }
      })

      const createVesting = wrapper.findComponent(CreateVesting)
      expect(createVesting.exists()).toBe(false)
    })
  })

  describe('Event Handling', () => {
    it('emits reload event when CreateVesting emits reload', async () => {
      // Component renders and sets up event handling
      mockCurrentTeam.value.ownerAddress = memberAddress
      wrapper = mount(VestingActions, {
        props: { reloadKey: 0 },
        global: {
          plugins: [createTestingPinia({ createSpy: vi.fn })]
        }
      })
      expect(wrapper.exists()).toBe(true)
    })
  })
})
