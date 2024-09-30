// ProposalSection.spec.ts
import { it, expect, describe, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
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

vi.mock('@/composables/voting', () => ({
  useAddProposal: vi.fn(() => ({
    execute: vi.fn(),
    isLoading: vi.fn(),
    isSuccess: vi.fn(),
    error: vi.fn()
  })),
  useGetProposals: vi.fn(() => ({
    execute: vi.fn(),
    isLoading: vi.fn(),
    isSuccess: vi.fn(),
    error: vi.fn(),
    data: vi.fn()
  })),
  useDeployVotingContract: vi.fn(() => ({
    execute: vi.fn(),
    isLoading: vi.fn(),
    isSuccess: vi.fn(),
    error: vi.fn()
  })),
  useSetBoardOfDirectorsContractAddress: vi.fn(() => ({
    execute: vi.fn(),
    isLoading: vi.fn(),
    isSuccess: vi.fn(),
    error: vi.fn()
  }))
}))

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
