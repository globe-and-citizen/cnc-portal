import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { ref } from 'vue'
import type { TableRow } from '@/components/TableComponent.vue'
import BodApprovalModal from '@/components/sections/ContractManagementView/BodApprovalModal.vue'

const CURRENT_ADDR = '0x0000000000000000000000000000000000000001'
const BOD_ADDR = '0x00000000000000000000000000000000000000b0'
const MEMBERS = [CURRENT_ADDR, '0x00000000000000000000000000000000000000aa']

// Stores mock
vi.mock('@/stores', () => ({
  useUserDataStore: () => ({ address: CURRENT_ADDR }),
  useTeamStore: () => ({
    currentTeam: {
      members: [
        { name: 'Alice', address: CURRENT_ADDR },
        { name: 'Bob', address: MEMBERS[1] }
      ]
    },
    getContractAddressByType: vi.fn(() => BOD_ADDR)
  })
}))

// wagmi/vue hook mock
vi.mock('@wagmi/vue', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>
  return {
    ...actual,
    useReadContract: vi.fn(({ functionName }: { functionName: string }) => {
      if (functionName === 'getBoardOfDirectors') {
        return { data: ref(MEMBERS), error: ref(null) }
      }
      return { data: ref(null), error: ref(null) }
    })
  }
})

// wagmi/core readContract mock used inside membersApprovals()
const readContractMock = vi.fn()
vi.mock('@wagmi/core', () => ({
  readContract: (...args: unknown[]) => readContractMock(...args)
}))

function mountComponent(overrides?: { alreadyApproved?: boolean }) {
  // Control per-member approval
  readContractMock.mockImplementation((_config: unknown, params: { args: [number, string] }) => {
    const member = params.args[1]
    // when alreadyApproved, current user returns true so Approve btn disabled
    if (overrides?.alreadyApproved) return Promise.resolve(member === CURRENT_ADDR)
    // otherwise, nobody has approved yet
    return Promise.resolve(false)
  })

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
