import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import SafeDeploymentCard from '@/components/sections/SafeView/SafeDeploymentCard.vue'
import { mockTeamData, mockUserStore, mockTeamStore, mockToast } from '@/tests/mocks'

const mockDeploySafeMutation = {
  mutate: vi.fn(),
  mutateAsync: vi.fn(),
  isPending: ref(false),
  isError: ref(false),
  error: ref<Error | null>(null),
  data: ref(null),
  reset: vi.fn()
}

const mockCreateContractMutation = {
  mutate: vi.fn(),
  mutateAsync: vi.fn(),
  isPending: ref(false),
  isError: ref(false),
  error: ref<Error | null>(null),
  data: ref(null),
  reset: vi.fn()
}

vi.mock('@/composables/safe/useSafeDeployment', () => ({
  useDeploySafe: vi.fn(() => mockDeploySafeMutation)
}))

vi.mock('@/queries/contract.queries', () => ({
  useCreateContractMutation: vi.fn(() => mockCreateContractMutation)
}))

const SAFE_ADDRESS = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'

function mountCard(props: { teamId?: number; teamOwnerAddress?: string } = {}) {
  return mount(SafeDeploymentCard, {
    props: { teamId: Number(mockTeamData.id), ...props }
  })
}

describe('SafeDeploymentCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDeploySafeMutation.isPending.value = false
    mockCreateContractMutation.isPending.value = false

    // Default: deploy + register both succeed synchronously so the chain
    // (deploy -> register -> toast -> emit) runs end-to-end.
    mockDeploySafeMutation.mutate.mockImplementation(
      (
        _vars: unknown,
        opts?: { onSuccess?: (data: { safeAddress: string }) => void | Promise<void> }
      ) => opts?.onSuccess?.({ safeAddress: SAFE_ADDRESS })
    )
    mockCreateContractMutation.mutate.mockImplementation(
      (_vars: unknown, opts?: { onSuccess?: () => void | Promise<void> }) => opts?.onSuccess?.()
    )
  })

  it('disables the deploy button when the connected address is not the team owner', () => {
    mockUserStore.address = '0x0000000000000000000000000000000000000099'
    mockTeamStore.currentTeam = { ...mockTeamData, ownerAddress: mockTeamData.ownerAddress }

    const wrapper = mountCard()
    const button = wrapper.find('[data-test="deploy-safe-button"]')
    expect(button.attributes('disabled')).toBeDefined()
  })

  it('uses the supplied team owner when deployed from the team creation wizard', async () => {
    mockUserStore.address = mockTeamData.ownerAddress
    mockTeamStore.currentTeam = {
      ...mockTeamData,
      ownerAddress: '0x0000000000000000000000000000000000000099'
    }

    const wrapper = mountCard({ teamOwnerAddress: mockTeamData.ownerAddress })

    expect(wrapper.find('[data-test="deploy-safe-button"]').attributes('disabled')).toBeUndefined()

    await wrapper.find('[data-test="deploy-safe-button"]').trigger('click')

    expect(mockDeploySafeMutation.mutate).toHaveBeenCalledWith(
      { owners: [mockTeamData.ownerAddress], threshold: 1 },
      expect.any(Object)
    )
  })

  it('deploys and registers the Safe, then emits safeDeployed on success', async () => {
    mockUserStore.address = mockTeamData.ownerAddress
    mockTeamStore.currentTeam = mockTeamData

    const wrapper = mountCard()
    await wrapper.find('[data-test="deploy-safe-button"]').trigger('click')
    await flushPromises()

    expect(mockDeploySafeMutation.mutate).toHaveBeenCalledTimes(1)
    const [vars] = mockDeploySafeMutation.mutate.mock.calls[0]
    expect(vars).toEqual({ owners: [mockTeamData.ownerAddress], threshold: 1 })

    expect(mockCreateContractMutation.mutate).toHaveBeenCalledTimes(1)
    const [registerVars] = mockCreateContractMutation.mutate.mock.calls[0]
    expect(registerVars).toEqual({
      body: {
        teamId: String(mockTeamData.id),
        contractAddress: SAFE_ADDRESS,
        contractType: 'Safe',
        deployer: mockTeamData.ownerAddress
      }
    })

    expect(mockToast.add).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Success', color: 'success' })
    )
    expect(wrapper.emitted('safeDeployed')).toEqual([[SAFE_ADDRESS]])
  })

  it('warns but still reports success when the Safe deploys but registration fails', async () => {
    mockUserStore.address = mockTeamData.ownerAddress
    mockTeamStore.currentTeam = mockTeamData
    mockCreateContractMutation.mutate.mockImplementation(
      (_vars: unknown, opts?: { onError?: (err: Error) => void | Promise<void> }) =>
        opts?.onError?.(new Error('registration exploded'))
    )

    const wrapper = mountCard()
    await wrapper.find('[data-test="deploy-safe-button"]').trigger('click')
    await flushPromises()

    expect(mockToast.add).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Warning',
        color: 'warning',
        description: expect.stringContaining('registration exploded')
      })
    )
    // Still surfaces the deploy as successful — the Safe is live on-chain even
    // though it isn't tracked in the backend yet.
    expect(mockToast.add).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Success', color: 'success' })
    )
    expect(wrapper.emitted('safeDeployed')).toEqual([[SAFE_ADDRESS]])
  })

  it('shows a rejection-specific toast when the user rejects the deploy transaction', async () => {
    mockUserStore.address = mockTeamData.ownerAddress
    mockTeamStore.currentTeam = mockTeamData
    mockDeploySafeMutation.mutate.mockImplementation(
      (_vars: unknown, opts?: { onError?: (err: Error) => void | Promise<void> }) =>
        opts?.onError?.(new Error('User rejected the request'))
    )

    const wrapper = mountCard()
    await wrapper.find('[data-test="deploy-safe-button"]').trigger('click')
    await flushPromises()

    expect(mockToast.add).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Error',
        description: 'Transaction approval rejected',
        color: 'error'
      })
    )
    expect(mockCreateContractMutation.mutate).not.toHaveBeenCalled()
  })
})
