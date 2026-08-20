import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { ref } from 'vue'
import SafeImportCard from '../SafeImportCard.vue'
import { mockTeamData, mockTeamStore, mockToast, mockUserStore } from '@/tests/mocks'

const SAFE_ADDRESS = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
const mockInspection = {
  mutate: vi.fn(),
  data: ref<{
    address: `0x${string}`
    owners: `0x${string}`[]
    threshold: number
    version: string
  }>(),
  error: ref<Error>(),
  isPending: ref(false),
  reset: vi.fn()
}
const mockCreateContract = {
  mutate: vi.fn(),
  error: ref<Error>(),
  isPending: ref(false)
}

vi.mock('@/composables/safe/useSafeImport', () => ({
  useInspectSafe: vi.fn(() => mockInspection)
}))

vi.mock('@/queries/contract.queries', () => ({
  useCreateContractMutation: vi.fn(() => mockCreateContract)
}))

function mountCard(props: Partial<{ teamId: number; teamOwnerAddress: string }> = {}) {
  return mount(SafeImportCard, {
    props: { teamId: Number(mockTeamData.id), ...props }
  })
}

describe('SafeImportCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockInspection.data.value = undefined
    mockInspection.error.value = undefined
    mockInspection.isPending.value = false
    mockCreateContract.error.value = undefined
    mockCreateContract.isPending.value = false
    mockUserStore.address = mockTeamData.ownerAddress
    mockTeamStore.currentTeam = mockTeamData

    mockInspection.mutate.mockImplementation(
      (
        _address: string,
        options?: { onSuccess?: (safe: typeof mockInspection.data.value) => void }
      ) => {
        const safe = {
          address: SAFE_ADDRESS as `0x${string}`,
          owners: ['0x1111111111111111111111111111111111111111'] as `0x${string}`[],
          threshold: 1,
          version: '1.4.1'
        }
        mockInspection.data.value = safe
        options?.onSuccess?.(safe)
      }
    )
    mockCreateContract.mutate.mockImplementation(
      (_params: unknown, options?: { onSuccess?: () => void }) => options?.onSuccess?.()
    )
  })

  it('inspects an entered Safe and shows its immutable confirmation summary', async () => {
    const wrapper = mountCard()

    await wrapper.find('[data-test="safe-import-address-input"]').setValue(SAFE_ADDRESS)
    await wrapper.find('[data-test="inspect-safe-button"]').trigger('click')
    await flushPromises()

    expect(mockInspection.mutate).toHaveBeenCalledWith(SAFE_ADDRESS)
    expect(wrapper.find('[data-test="safe-import-summary"]').text()).toContain('1 of 1')
    expect(wrapper.find('[data-test="safe-import-summary"]').text()).toContain('1.4.1')
  })

  it('registers the inspected Safe through the existing contract mutation', async () => {
    const wrapper = mountCard()
    await wrapper.find('[data-test="safe-import-address-input"]').setValue(SAFE_ADDRESS)
    await wrapper.find('[data-test="inspect-safe-button"]').trigger('click')
    await flushPromises()
    await wrapper.find('[data-test="confirm-safe-import-button"]').trigger('click')

    expect(mockCreateContract.mutate).toHaveBeenCalledWith(
      {
        body: {
          teamId: String(mockTeamData.id),
          contractAddress: SAFE_ADDRESS,
          contractType: 'Safe',
          deployer: mockTeamData.ownerAddress
        }
      },
      expect.any(Object)
    )
    expect(wrapper.emitted('safe-imported')).toEqual([[SAFE_ADDRESS]])
    expect(mockToast.add).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Success', color: 'success' })
    )
  })

  it('uses the team owner passed by the creation flow to authorize an import', async () => {
    mockTeamStore.currentTeam = {
      ...mockTeamData,
      ownerAddress: '0x0000000000000000000000000000000000000099'
    }
    const wrapper = mountCard({ teamOwnerAddress: mockTeamData.ownerAddress })
    await wrapper.find('[data-test="safe-import-address-input"]').setValue(SAFE_ADDRESS)
    await wrapper.find('[data-test="inspect-safe-button"]').trigger('click')
    await flushPromises()
    await wrapper.find('[data-test="confirm-safe-import-button"]').trigger('click')

    expect(mockCreateContract.mutate).toHaveBeenCalled()
  })

  it('allows a non-owner to inspect but not import a Safe', async () => {
    mockUserStore.address = '0x0000000000000000000000000000000000000099'
    const wrapper = mountCard()
    await wrapper.find('[data-test="safe-import-address-input"]').setValue(SAFE_ADDRESS)

    expect(wrapper.find('[data-test="inspect-safe-button"]').attributes('disabled')).toBeUndefined()
    expect(
      wrapper.find('[data-test="confirm-safe-import-button"]').attributes('disabled')
    ).toBeDefined()
    await wrapper.find('[data-test="inspect-safe-button"]').trigger('click')
    expect(mockInspection.mutate).toHaveBeenCalledWith(SAFE_ADDRESS)
  })

  it('shows the configured network and the inspected owner list before import', async () => {
    const wrapper = mountCard()
    await wrapper.find('[data-test="safe-import-address-input"]').setValue(SAFE_ADDRESS)
    await wrapper.find('[data-test="inspect-safe-button"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-test="safe-import-network"]').text()).toContain(
      'Safe must be deployed'
    )
    expect(wrapper.find('[data-test="safe-import-owners-toggle"]').text()).toContain('View 1 owner')
  })

  it('clears the inspection when the user chooses another address', async () => {
    const wrapper = mountCard()
    await wrapper.find('[data-test="safe-import-address-input"]').setValue(SAFE_ADDRESS)
    await wrapper.find('[data-test="inspect-safe-button"]').trigger('click')
    await flushPromises()
    await wrapper.find('[data-test="safe-import-reset-button"]').trigger('click')

    expect(mockInspection.reset).toHaveBeenCalledTimes(1)
    expect(wrapper.find('[data-test="safe-import-address-input"]').element.value).toBe('')
  })
})
