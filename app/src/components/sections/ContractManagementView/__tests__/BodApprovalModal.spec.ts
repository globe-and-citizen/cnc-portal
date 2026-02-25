import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { ref } from 'vue'
import type { TableRow } from '@/components/TableComponent.vue'
import BodApprovalModal from '@/components/sections/ContractManagementView/BodApprovalModal.vue'
import {
  useReadContractFn,
  mockTeamStore,
  mockUserStore,
  mockWagmiCore
} from '@/tests/mocks'
import { useTeamStore, useUserDataStore } from '@/stores'

const CURRENT_ADDR = '0x0000000000000000000000000000000000000001'
const BOD_ADDR = '0x00000000000000000000000000000000000000b0'
const MEMBERS = [CURRENT_ADDR, '0x00000000000000000000000000000000000000aa']

function mountComponent(overrides?: { alreadyApproved?: boolean }) {
  // Control per-member approval via the global wagmi/core mock
  mockWagmiCore.readContract.mockImplementation(
    (_config: unknown, params: { args: [number, string] }) => {
      const member = params.args[1]
      if (overrides?.alreadyApproved) return Promise.resolve(member === CURRENT_ADDR)
      return Promise.resolve(false)
    }
  )

  // Strongly-typed minimal row (only fields used by the component)
  const baseRow: Pick<TableRow, 'id' | 'actionId' | 'title' | 'description' | 'requestedBy'> = {
    id: 42,
    actionId: 7,
    title: 'Ownership Transfer Request',
    description: `Transfer ownership of SomeContract to BOD ${MEMBERS[1]}`,
    requestedBy: { name: 'Alice', address: CURRENT_ADDR }
  }
  const row = baseRow as unknown as TableRow

  return mount(BodApprovalModal, {
    props: {
      loading: false,
      row
    },
    global: { plugins: [createTestingPinia({ createSpy: vi.fn })] }
  })
}

describe('BodApprovalModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Configure store mocks
    vi.mocked(useUserDataStore).mockReturnValue({
      ...mockUserStore,
      address: CURRENT_ADDR
    })
    vi.mocked(useTeamStore).mockReturnValue({
      ...mockTeamStore,
      currentTeam: {
        ...mockTeamStore.currentTeam,
        members: [
          { name: 'Alice', address: CURRENT_ADDR },
          { name: 'Bob', address: MEMBERS[1] }
        ]
      } as ReturnType<typeof useTeamStore>['currentTeam'],
      getContractAddressByType: vi.fn(() => BOD_ADDR)
    } as ReturnType<typeof useTeamStore>)
    // Configure wagmi mocks
    useReadContractFn.mockImplementation(({ functionName }: { functionName: string }) => {
      if (functionName === 'getBoardOfDirectors') {
        return { data: ref(MEMBERS), error: ref(null) }
      }
      return { data: ref(null), error: ref(null) }
    })
  })

  it('renders and shows approval progress', async () => {
    const wrapper = mountComponent({ alreadyApproved: true })
    await flushPromises()
    // Progress summary "1/2" when current user has approved
    expect(wrapper.text()).toContain('1/2')
    // Approvals list renders members
    expect(wrapper.text()).toContain('Alice')
    expect(wrapper.text()).toContain('Bob')
  })

  it('emits approve-action when clicking approve and user has not approved yet', async () => {
    const wrapper = mountComponent({ alreadyApproved: false })
    await flushPromises()

    const approveBtn = wrapper.find('[data-test="transfer-ownership-button"]')
    expect(approveBtn.exists()).toBe(true)
    await approveBtn.trigger('click')

    const emitted = wrapper.emitted('approve-action')
    expect(emitted).toBeTruthy()
    expect(emitted?.[0]).toEqual([7, 42]) // actionId, id
  })

  it('disables approve button when already approved', async () => {
    const wrapper = mountComponent({ alreadyApproved: true })
    await flushPromises()

    // Find the ButtonUI that is the Approve Action button
    const buttons = wrapper.findAllComponents({ name: 'ButtonUI' })
    const approveBtn = buttons.find((b) => b.text().includes('Approve Action'))
    expect(approveBtn).toBeTruthy()
    expect(approveBtn!.props('disabled')).toBe(true)
  })

  it('emits close on cancel button', async () => {
    const wrapper = mountComponent()
    await flushPromises()

    await wrapper.find('[data-test="cancel-button"]').trigger('click')
    expect(wrapper.emitted('close')).toBeTruthy()
  })
})
