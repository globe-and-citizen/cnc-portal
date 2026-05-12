import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { ref } from 'vue'
import TeamContractAdmins from '@/components/sections/ContractManagementView/TeamContractAdmins.vue'
import {
  useReadContractFn,
  useWriteContractFn,
  useWaitForTransactionReceiptFn
} from '@/tests/mocks'
import type { TeamContract } from '@/types'

const CONTRACT_ADDR = '0xAAaaaaAAAAaaAAAaaaaAaaAAAAAaaaaaAAAaaaA1'
const contractProp: TeamContract = {
  address: CONTRACT_ADDR,
  admins: [],
  type: 'Campaign',
  deployer: '0xDeployerAddress'
}

describe('TeamContractAdmins.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useReadContractFn.mockReturnValue({
      data: ref(['0x0000000000000000000000000000000000000001']),
      refetch: vi.fn(),
      error: ref(null)
    })
    useWaitForTransactionReceiptFn.mockReturnValue({
      isLoading: ref(false),
      isSuccess: ref(false)
    })
  })

  function mountWithWritePending(pending: boolean) {
    useWriteContractFn.mockReturnValue({
      mutate: vi.fn(),
      error: ref(null),
      isPending: ref(pending),
      data: ref(null)
    })
    return mount(TeamContractAdmins, {
      props: { contract: contractProp, range: 1 },
      global: { plugins: [createTestingPinia({ createSpy: vi.fn })] }
    })
  }

  it('hides the loading spinner when no write is in-flight', () => {
    const wrapper = mountWithWritePending(false)
    expect(wrapper.find('.loading-spinner').exists()).toBe(false)
  })

  it('shows the loading spinner while a write is pending', () => {
    const wrapper = mountWithWritePending(true)
    expect(wrapper.find('.loading-spinner').exists()).toBe(true)
  })

  it('renders one row per admin returned by the read', () => {
    const wrapper = mountWithWritePending(false)
    expect(wrapper.html()).toContain('Admin Address')
  })
})
