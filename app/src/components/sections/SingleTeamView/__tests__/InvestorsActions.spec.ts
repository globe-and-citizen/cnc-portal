import { beforeEach, describe, expect , it, vi} from 'vitest'
import InvestorsActions from '@/components/sections/SingleTeamView/InvestorsActions.vue'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { ref } from 'vue'

vi.mock('@/stores/useToastStore', () => {
  return {
    useToastStore: vi.fn(() => ({
      addSuccessToast: vi.fn(),
      addErrorToast: vi.fn()
    }))
  }
})

const mockUseReadContract = {
  data: ref<string | null>(null),
  isLoading: ref(false),
  error: ref(null),
  refetch: vi.fn()
}

const mockUseWriteContract = {
  writeContract: vi.fn(),
  error: ref(null),
  isPending: ref(false),
  data: ref(null)
}

const mockUseWaitForTransactionReceipt = {
  isLoading: ref(false),
  isSuccess: ref(false)
}
const mockUseSendTransaction = {
  isPending: ref(false),
  error: ref(false),
  data: ref<string>(''),
  sendTransaction: vi.fn()
}
const mockUseBalance = {
  data: ref<string | null>(null),
  isLoading: ref(false),
  error: ref(null),
  refetch: vi.fn()
}
// Mocking wagmi functions
vi.mock('@wagmi/vue', async (importOriginal) => {
  const actual: Object = await importOriginal()
  return {
    ...actual,
    useReadContract: vi.fn(() => mockUseReadContract),
    useWriteContract: vi.fn(() => mockUseWriteContract),
    useWaitForTransactionReceipt: vi.fn(() => mockUseWaitForTransactionReceipt),
    useSendTransaction: vi.fn(() => mockUseSendTransaction),
    useBalance: vi.fn(() => mockUseBalance)
  }
})
describe('InvestorsActions.vue', () => {
  setActivePinia(createPinia())

  let wrapper: ReturnType<typeof mount>
  const props = {
    team: {
      id: '1',
      name: 'Team 1',
      description: 'Team 1 Description',
      bankAddress: '0x123',
      members: [],
      ownerAddress: '0x123',
      votingAddress: '0x123',
      investorsAddress: '0x123',
      boardOfDirectorsAddress: '0x123'
    },
    tokenSymbol: 'ETH',
    tokenSymbolLoading: false,
    shareholders: []
  }

  beforeEach(() => {
    wrapper = mount(InvestorsActions, {
      props: { ...props }
    })
  })

  describe('Render', () => {

    it('render the investors actions', async () => {
      await wrapper.vm.$nextTick()
      console.log('wrapper', wrapper.html())
      expect(wrapper.find('[data-test="investors-actions"]').exists()).toBe(true)
      expect(wrapper.find('[data-test="investors-actions"]').text()).toContain('Owner Interaction')
    })
  })
})
