import { mount, VueWrapper } from '@vue/test-utils'
import OfficerForm from '@/components/forms/OfficerForm.vue'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useDeployOfficerContract } from '@/composables/officer'
import { ref } from 'vue'

// Mock the composables
vi.mock('@/composables/officer', () => ({
  useDeployOfficerContract: vi.fn(),
  useDeployBank: vi.fn(),
  useDeployVoting: vi.fn(),
  useGetOfficerTeam: vi.fn(),
  useDeployExpenseAccount: vi.fn()
}))

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

describe('OfficerForm.vue', () => {
  let mockDeployOfficer: ReturnType<typeof useDeployOfficerContract>

  beforeEach(() => {
    // Mock return values for composables
    mockDeployOfficer = {
      execute: vi.fn(),
      isLoading: ref(false),
      isSuccess: ref(false),
      error: ref(null),
      contractAddress: ref(null)
    }

    // Mock composables return values
    vi.mocked(useDeployOfficerContract).mockReturnValue(mockDeployOfficer)
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
})
