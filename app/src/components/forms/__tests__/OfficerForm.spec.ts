import { mount, VueWrapper } from '@vue/test-utils'
import OfficerForm from '@/components/forms/OfficerForm.vue'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import CreateOfficerTeam from '../CreateOfficerTeam.vue'
import type { Team } from '@/types'
import { useToastStore } from '@/stores/__mocks__/useToastStore'
import ButtonUI from '@/components/ButtonUI.vue'

// Mock the composables

vi.mock('@/stores/useToastStore')

const mockUseReadContract = {
  data: ref<unknown | null>(null),
  isLoading: ref(false),
  error: ref(null),
  refetch: vi.fn()
}
const mockUseWatchContractEvent = {
  onLogs: vi.fn() // Mock function to simulate event callback
}
const mockUseWriteContract = {
  writeContract: vi.fn(),
  error: ref<unknown>(null),
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
const mockOfficerTeamData = ref(null)

vi.mock('@wagmi/vue', () => ({
  useReadContract: vi.fn(() => ({
    data: mockOfficerTeamData,
    isLoading: ref(false)
  }))
}))
vi.mock('@wagmi/vue', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    useReadContract: vi.fn(() => mockUseReadContract),
    useWriteContract: vi.fn(() => mockUseWriteContract),
    useWaitForTransactionReceipt: vi.fn(() => mockUseWaitForTransactionReceipt),
    useSendTransaction: vi.fn(() => mockUseSendTransaction),
    useBalance: vi.fn(() => mockUseBalance),
    useWatchContractEvent: vi.fn(() => mockUseWatchContractEvent) // Include the new mock
  }
})

interface Props {
  team: Partial<Team>
}

describe('OfficerForm.vue', () => {
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

  it('renders CreateOfficerTeam', async () => {
    const wrapper: VueWrapper = mount(OfficerForm, {
      props: {
        team: { officerAddress: '0x123' }
      }
    })
    mockUseReadContract.data.value = [[]]
    await wrapper.vm.$nextTick()

    expect(wrapper.findComponent(CreateOfficerTeam).exists()).toBeTruthy()
    wrapper.findComponent(CreateOfficerTeam).vm.$emit('getTeam')

    expect(wrapper.emitted('getTeam')).toBeTruthy()
  })

  it('renders members and founders correctly', () => {
    const wrapper: VueWrapper = mount(OfficerForm, {
      props: {
        team: {
          officerAddress: '0x123',
          members: [
            { address: '0x1', name: 'Member 1' },
            { address: '0x2', name: 'Member 2' }
          ],
          founders: ['0x1', '0x2']
        }
      }
    })

    expect(wrapper.findAll('.badge-primary').length).toBe(2)
    expect(wrapper.findAll('.badge-primary')[0].text()).toContain('0x1')
  })

  it('renders all founders', async () => {
    const wrapper: VueWrapper = mount(OfficerForm, {
      props: {
        team: {
          officerAddress: '0x123',
          members: [
            { address: '0x1', name: 'Member 1' },
            { address: '0x2', name: 'Member 2' }
          ]
        }
      }
    })
    mockUseReadContract.data.value = [['0x1', '0x2', '0x3']]
    await wrapper.vm.$nextTick()

    expect(wrapper.findAll('div[data-test="founder-div"]').length).toBe(3)

    const founders = wrapper.findAll('span[data-test="founder"]')
    founders.forEach((founder, index) => {
      if ((wrapper.vm.$props as Props)?.team?.members?.[index]) {
        expect(founder.text()).toEqual(
          `${(wrapper.vm.$props as unknown as Props).team.members?.[index]?.name ?? 'Unknown'} | ${(wrapper.vm.$props as unknown as Props).team.members?.[index]?.address ?? 'Unknown'}`
        )
      } else {
        expect(founder.text()).toEqual('Unknown Member | 0x3')
      }
    })
  })

  it('renders all members', async () => {
    const wrapper: VueWrapper = mount(OfficerForm, {
      props: {
        team: {
          officerAddress: '0x123',
          members: [
            { address: '0x1', name: 'Member 1' },
            { address: '0x2', name: 'Member 2' }
          ]
        }
      }
    })
    mockUseReadContract.data.value = [['0xfounder'], ['0x1', '0x2', '0x3']]
    await wrapper.vm.$nextTick()

    expect(wrapper.findAll('div[data-test="member-div"]').length).toBe(3)

    const members = wrapper.findAll('span[data-test="member"]')
    members.forEach((member, index) => {
      if ((wrapper.vm.$props as Props)?.team?.members?.[index]) {
        expect(member.text()).toEqual(
          `${(wrapper.vm.$props as unknown as Props).team.members?.[index]?.name ?? 'Unknown'} | ${(wrapper.vm.$props as unknown as Props).team.members?.[index]?.address ?? 'Unknown'}`
        )
      } else {
        expect(member.text()).toEqual('Unknown Member | 0x3')
      }
    })
  })

  it('renders Loading state if createOfficerLoading is true', async () => {
    const wrapper: VueWrapper = mount(OfficerForm, {
      props: {
        team: {}
      }
    })

    mockUseWriteContract.isPending.value = true
    mockUseWaitForTransactionReceipt.isLoading.value = true
    await wrapper.setValue({ loading: true })

    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()
    console.log('wrapper', wrapper.html())
    expect(wrapper.findComponent(ButtonUI).exists()).toBeTruthy()
    expect(wrapper.findComponent(ButtonUI).props().loading).toBe(true)
  })

  describe('OfficerForm.vue - Additional Tests', () => {
    beforeEach(() => {
      vi.clearAllMocks()
    })

    // it('renders loading spinner when data is being fetched', () => {
    //   mockUseReadContract.isLoading.value = true
    //   const wrapper: VueWrapper = mount(OfficerForm, {
    //     props: {
    //       team: { officerAddress: '0x123' }
    //     }
    //   })

    //   expect(wrapper.find('.loading-spinner').exists()).toBe(true)
    // })

    it('hides Deploy Bank button when bank is deployed', () => {
      const wrapper: VueWrapper = mount(OfficerForm, {
        props: {
          team: {
            officerAddress: '0x123',
            bankAddress: '0xBank'
          }
        }
      })

      const deployBankButton = wrapper.find('[data-test="deployBankButton"]')
      expect(deployBankButton.exists()).toBe(false)
    })

    it('hides Deploy Expense button when expense is deployed', () => {
      const wrapper: VueWrapper = mount(OfficerForm, {
        props: {
          team: {
            officerAddress: '0x123',
            expenseAccountAddress: '0xExpense'
          }
        }
      })

      const deployExpenseButton = wrapper.find('[data-test="deployExpenseButton"]')
      expect(deployExpenseButton.exists()).toBe(false)
    })

    it('calls addErrorToast when contract deployment fails', async () => {
      const { addErrorToast } = useToastStore()
      const wrapper: VueWrapper = mount(OfficerForm, {
        props: {
          team: {
            officerAddress: '0x123'
          }
        }
      })

      mockUseWriteContract.error.value = new Error('Bank deployment failed')
      await wrapper.vm.$nextTick()

      expect(addErrorToast).toHaveBeenCalledWith('Failed to deploy officer contract')
    })

    it('handles transaction waiting errors', async () => {
      const { addErrorToast } = useToastStore()
      const wrapper: VueWrapper = mount(OfficerForm, {
        props: {
          team: { officerAddress: null }
        }
      })

      mockUseWaitForTransactionReceipt.isLoading.value = true
      await wrapper.vm.$nextTick()
      mockUseWriteContract.error.value = new Error('Transaction failed')
      await wrapper.vm.$nextTick()

      expect(addErrorToast).toHaveBeenCalledWith('Failed to deploy officer contract')
    })
  })

  describe('OfficerForm.vue - Contract Deployments', () => {
    beforeEach(() => {
      vi.clearAllMocks()
    })

    it('hides deployment buttons when contracts are deployed', async () => {
      const wrapper: VueWrapper = mount(OfficerForm, {
        props: {
          team: {
            officerAddress: '0x123',
            bankAddress: '0xBank',
            votingAddress: '0xVoting',
            expenseAccountAddress: '0xExpense',
            expenseAccountEip712Address: '0xExpenseEip712'
          }
        }
      })

      mockUseReadContract.data.value = [
        [], // founders
        [], // members
        '0xBank',
        '0xVoting',
        '0xBoD',
        '0xExpense',
        '0xExpenseEip712'
      ]
      await wrapper.vm.$nextTick()

      expect(wrapper.find('[data-test="deployBankButton"]').exists()).toBe(false)
      expect(wrapper.find('[data-test="deployVotingButton"]').exists()).toBe(false)
      expect(wrapper.find('[data-test="deployExpenseButton"]').exists()).toBe(false)
      expect(wrapper.find('[data-test="deployExpenseButtonEip712"]').exists()).toBe(false)
    })

    it('handles contract deployment errors correctly', async () => {
      const { addErrorToast } = useToastStore()
      const wrapper: VueWrapper = mount(OfficerForm, {
        props: {
          team: { officerAddress: '0x123' }
        }
      })

      // Simulate deployment error
      mockUseWriteContract.error.value = new Error('Deployment failed')
      await wrapper.vm.$nextTick()

      expect(addErrorToast).toHaveBeenCalled()
    })
  })
})
