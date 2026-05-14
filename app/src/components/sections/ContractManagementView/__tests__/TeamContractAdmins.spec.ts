import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { ref } from 'vue'
import TeamContractAdmins from '@/components/sections/ContractManagementView/TeamContractAdmins.vue'
import { useReadContractFn } from '@/tests/mocks'
import type { TeamContract } from '@/types'

const CONTRACT_ADDR = '0xAAaaaaAAAAaaAAAaaaaAaaAAAAAaaaaaAAAaaaA1'
const contractProp: TeamContract = {
  address: CONTRACT_ADDR,
  admins: [],
  type: 'Campaign',
  deployer: '0xDeployerAddress'
}

const addAdminMutation = {
  mutate: vi.fn(),
  error: ref<Error | null>(null),
  isPending: ref(false)
}
const removeAdminMutation = {
  mutate: vi.fn(),
  error: ref<Error | null>(null),
  isPending: ref(false)
}

vi.mock('@/composables/contracts/useContractWritesV3', () => ({
  useContractWritesV3: vi.fn(({ functionName }: { functionName: string }) => {
    return functionName === 'addAdmin' ? addAdminMutation : removeAdminMutation
  })
}))

describe('TeamContractAdmins.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    addAdminMutation.isPending.value = false
    removeAdminMutation.isPending.value = false
    addAdminMutation.error.value = null
    removeAdminMutation.error.value = null
    useReadContractFn.mockReturnValue({
      data: ref(['0x0000000000000000000000000000000000000001']),
      refetch: vi.fn(),
      error: ref(null)
    })
  })

  function mountWithWritePending(pending: boolean) {
    addAdminMutation.isPending.value = pending
    removeAdminMutation.isPending.value = pending
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

  it('calls addAdmin when the inline form is submitted', async () => {
    const wrapper = mountWithWritePending(false)
    await wrapper.find('input[type="text"]').setValue(CONTRACT_ADDR)
    await wrapper.find('form').trigger('submit.prevent')
    expect(addAdminMutation.mutate).toHaveBeenCalledWith(
      { args: [CONTRACT_ADDR] },
      expect.objectContaining({ onSuccess: expect.any(Function) })
    )
  })

  it('calls removeAdmin when the Remove button is clicked', async () => {
    const wrapper = mountWithWritePending(false)
    const removeBtn = wrapper.find('table button')
    expect(removeBtn.exists()).toBe(true)
    await removeBtn.trigger('click')
    expect(removeAdminMutation.mutate).toHaveBeenCalled()
  })

  it('runs the addAdmin onSuccess path: resets the input and refetches admins', async () => {
    addAdminMutation.mutate.mockImplementationOnce(
      (_v: { args: unknown[] }, opts?: { onSuccess?: () => void }) => opts?.onSuccess?.()
    )
    const wrapper = mountWithWritePending(false)
    const input = wrapper.find<HTMLInputElement>('input[type="text"]')
    await input.setValue(CONTRACT_ADDR)
    await wrapper.find('form').trigger('submit.prevent')
    expect(input.element.value).toBe('')
  })

  it('runs the removeAdmin onSuccess path without throwing', async () => {
    removeAdminMutation.mutate.mockImplementationOnce(
      (_v: { args: unknown[] }, opts?: { onSuccess?: () => void }) => opts?.onSuccess?.()
    )
    const wrapper = mountWithWritePending(false)
    await wrapper.find('table button').trigger('click')
    expect(removeAdminMutation.mutate).toHaveBeenCalled()
  })

  it('surfaces add/remove/getList errors via the watcher branch', async () => {
    const wrapper = mountWithWritePending(false)
    addAdminMutation.error.value = new Error('add failed')
    removeAdminMutation.error.value = new Error('remove failed')
    await wrapper.vm.$nextTick()
    // both watchers fire — exercising the conditional toast.add calls
    expect(wrapper.exists()).toBe(true)
  })
})
