import { mount, VueWrapper } from '@vue/test-utils'
import OfficerForm from '@/components/forms/OfficerForm.vue'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  useDeployOfficerContract,
  useDeployBank,
  useDeployVoting,
  useGetOfficerTeam
} from '@/composables/officer'
import { ref } from 'vue'

// Mock the composables
vi.mock('@/composables/officer', () => ({
  useDeployOfficerContract: vi.fn(),
  useDeployBank: vi.fn(),
  useDeployVoting: vi.fn(),
  useGetOfficerTeam: vi.fn()
}))

vi.mock('@/stores/useToastStore', () => {
  return {
    useToastStore: vi.fn(() => ({
      addSuccessToast: vi.fn(),
      addErrorToast: vi.fn()
    }))
  }
})

describe('OfficerForm.vue', () => {
  let mockDeployOfficer: ReturnType<typeof useDeployOfficerContract>
  let mockDeployBank: ReturnType<typeof useDeployBank>
  let mockDeployVoting: ReturnType<typeof useDeployVoting>
  let mockGetOfficerTeam: ReturnType<typeof useGetOfficerTeam>

  beforeEach(() => {
    // Mock return values for composables
    mockDeployOfficer = {
      execute: vi.fn(),
      isLoading: ref(false),
      isSuccess: ref(false),
      error: ref(null),
      contractAddress: ref(null)
    }
    mockDeployBank = {
      execute: vi.fn(),
      isLoading: ref(false),
      isSuccess: ref(false),
      error: ref(null)
    }
    mockDeployVoting = {
      execute: vi.fn(),
      isLoading: ref(false),
      isSuccess: ref(false),
      error: ref(null)
    }
    mockGetOfficerTeam = {
      execute: vi.fn(),
      isLoading: ref(false),
      isSuccess: ref(false),
      error: ref(null),
      officerTeam: ref({
        founders: ['0x123'],
        members: ['0x456'],
        bankAddress: '',
        votingAddress: '',
        bodAddress: ''
      })
    }
    // Mock composables return values
    vi.mocked(useDeployOfficerContract).mockReturnValue(mockDeployOfficer)
    vi.mocked(useDeployBank).mockReturnValue(mockDeployBank)
    vi.mocked(useDeployVoting).mockReturnValue(mockDeployVoting)
    vi.mocked(useGetOfficerTeam).mockReturnValue(mockGetOfficerTeam)
  })
  it('renders officer deployment button when no officer contract is deployed', () => {
    const wrapper: VueWrapper = mount(OfficerForm, {
      props: {
        team: { officerAddress: null }
      }
    })

    expect(wrapper.find('button').text()).toBe('Create Officer Contract')
  })

  it('renders officer contract address when deployed', () => {
    const wrapper: VueWrapper = mount(OfficerForm, {
      props: {
        team: { officerAddress: '0x123' }
      }
    })

    expect(wrapper.find('.badge-primary').text()).toContain('0x123')
  })

  it('calls deployOfficerContract on button click', async () => {
    const wrapper: VueWrapper = mount(OfficerForm, {
      props: {
        team: { officerAddress: null }
      }
    })

    const button = wrapper.find('button')
    await button.trigger('click')

    expect(mockDeployOfficer.execute).toHaveBeenCalled()
    expect(mockDeployOfficer.isLoading.value).toBe(false)
    expect(mockDeployOfficer.error.value).toBe(null)
    expect(mockDeployOfficer.contractAddress.value).toBe(null)
  })

  it('shows loading spinner during officer deployment', async () => {
    mockDeployOfficer.isLoading.value = true
    const wrapper: VueWrapper = mount(OfficerForm, {
      props: {
        team: { officerAddress: null }
      }
    })

    expect(wrapper.findComponent({ name: 'LoadingButton' }).exists()).toBe(true)
  })
  it('calls deployOfficerContract on button click', async () => {
    const wrapper = mount(OfficerForm, {
      props: { team: { officerAddress: null } }
    })

    const button = wrapper.find('button')
    await button.trigger('click')
    await wrapper.vm.$nextTick() // Wait for DOM updates

    expect(mockDeployOfficer.execute).toHaveBeenCalled()
    expect(mockDeployOfficer.isLoading.value).toBe(false)
    expect(mockDeployOfficer.error.value).toBe(null)
  })
  it('shows loading spinner when officer contract is deploying', async () => {
    mockDeployOfficer.isLoading.value = true
    const wrapper = mount(OfficerForm, {
      props: { team: { officerAddress: null } }
    })

    expect(wrapper.findComponent({ name: 'LoadingButton' }).exists()).toBe(true)
  })

  it('calls deployBankAccount when bank deploy button is clicked', async () => {
    const wrapper: VueWrapper = mount(OfficerForm, {
      props: {
        team: { officerAddress: '0x123' }
      }
    })

    const bankButton = wrapper.findAll('button')[0]
    await bankButton.trigger('click')

    expect(mockDeployBank.execute).toHaveBeenCalled()
    expect(mockDeployBank.isLoading.value).toBe(false)
    expect(mockDeployBank.error.value).toBe(null)
  })

  it('calls deployVotingContract when voting deploy button is clicked', async () => {
    const wrapper: VueWrapper = mount(OfficerForm, {
      props: {
        team: { officerAddress: '0x123' }
      }
    })

    const votingButton = wrapper.findAll('button')[1]
    await votingButton.trigger('click')

    expect(mockDeployVoting.execute).toHaveBeenCalled()
    expect(mockDeployVoting.isLoading.value).toBe(false)
    expect(mockDeployVoting.error.value).toBe(null)
  })
})
