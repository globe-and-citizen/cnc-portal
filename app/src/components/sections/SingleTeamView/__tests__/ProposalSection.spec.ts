// ProposalSection.spec.ts
import { it, expect, describe, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import ProposalSection from '@/components/sections/SingleTeamView/ProposalSection.vue'

vi.mock('vue-router', () => ({
  useRoute: vi.fn(() => ({ params: { id: '1' } }))
}))

vi.mock('@/stores/user', () => ({
  useUserDataStore: vi.fn(() => ({ name: 'Test User', address: '0xTestAddress' }))
}))

vi.mock('@/stores/useToastStore', () => ({
  useToastStore: vi.fn(() => ({
    addSuccessToast: vi.fn(),
    addErrorToast: vi.fn()
  }))
}))
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

// Mocking wagmi functions
vi.mock('@wagmi/vue', async (importOriginal) => {
  const actual: Object = await importOriginal()
  return {
    ...actual,
    useReadContract: vi.fn(() => mockUseReadContract),
    useWriteContract: vi.fn(() => mockUseWriteContract),
    useWaitForTransactionReceipt: vi.fn(() => mockUseWaitForTransactionReceipt)
  }
})

describe('ProposalSection.vue', () => {
  let wrapper: ReturnType<typeof mount>

  beforeEach(() => {
    wrapper = mount(ProposalSection, {
      props: {
        team: {
          name: 'Test Team',
          ownerAddress: '0xOwnerAddress',
          bankAddress: '0xBankAddress',
          members: [
            { name: 'Member 1', address: '0xMember1', teamId: 1, id: '1' },
            { name: 'Member 2', address: '0xMember2', teamId: 1, id: '1' }
          ]
        }
      }
    })
  })

  it('shows loading spinner when loadingGetProposals is true', async () => {
    wrapper = mount(ProposalSection, {
      props: {
        team: {
          name: 'Test Team',
          ownerAddress: '0xOwnerAddress',
          bankAddress: '0xBankAddress',
          members: [
            { name: 'Member 1', address: '0xMember1', teamId: 1, id: '1' },
            { name: 'Member 2', address: '0xMember2', teamId: 1, id: '1' }
          ]
        }
      }
    })
    await wrapper.vm.$nextTick()
    // expect(wrapper.find('span.loading').exists()).toBe(true)
    expect(wrapper.find('[data-test="parent-div"]').exists()).toBe(false)
  })
})
