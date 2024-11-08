import { mount, VueWrapper } from '@vue/test-utils'
import OfficerForm from '@/components/forms/OfficerForm.vue'
import { describe, it, expect, vi } from 'vitest'
import { ref } from 'vue'

// Mock the composables

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
const mockUseWatchContractEvent = {
  onLogs: vi.fn() // Mock function to simulate event callback
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
const mockOfficerTeamData = ref(null)

vi.mock('@wagmi/vue', () => ({
  useReadContract: vi.fn(() => ({
    data: mockOfficerTeamData,
    isLoading: ref(false)
  }))
}))
vi.mock('@wagmi/vue', async (importOriginal) => {
  const actual: Object = await importOriginal()
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

    expect(wrapper.findAll('.badge-primary').length).toBe(1)
    expect(wrapper.findAll('.badge-primary')[0].text()).toContain('0x1')
  })
})
