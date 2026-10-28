import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { ref } from 'vue'
import type { Address } from 'viem'
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

describe('[US-SAFE-001] SafeImportCard', () => {
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

  describe('a Safe already in the team', () => {
    const DEFAULT_SAFE = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
    const REMOVED_SAFE = '0xcccccccccccccccccccccccccccccccccccccccc'
    const safe = (address: string, removedAt: string | null = null) => ({
      address: address as Address,
      type: 'Safe' as const,
      deployer: mockTeamData.ownerAddress,
      admins: [],
      removedAt
    })

    beforeEach(() => {
      mockTeamStore.currentTeam = {
        ...mockTeamData,
        teamContracts: [
          ...mockTeamData.teamContracts,
          safe(DEFAULT_SAFE),
          safe(REMOVED_SAFE, '2026-10-01T00:00:00.000Z')
        ]
      }
    })

    it('[AC-US-SAFE-001-13] says the pasted address is already the default Safe and blocks inspect and import', async () => {
      const wrapper = mountCard()
      await wrapper.find('[data-test="safe-import-address-input"]').setValue(DEFAULT_SAFE)

      expect(wrapper.find('[data-test="safe-import-already-registered"]').text()).toContain(
        "already this team's default Safe"
      )
      expect(wrapper.find('[data-test="inspect-safe-button"]').attributes('disabled')).toBeDefined()
      expect(
        wrapper.find('[data-test="confirm-safe-import-button"]').attributes('disabled')
      ).toBeDefined()
    })

    it('[AC-US-SAFE-001-13] points a Safe from the history to Set as default instead of importing it', async () => {
      const wrapper = mountCard()
      await wrapper.find('[data-test="safe-import-address-input"]').setValue(REMOVED_SAFE)

      expect(wrapper.find('[data-test="safe-import-already-registered"]').text()).toContain(
        "already in this team's Safe history"
      )
      expect(wrapper.find('[data-test="inspect-safe-button"]').attributes('disabled')).toBeDefined()
    })

    it('[AC-US-SAFE-001-13] does not check the Safes of another team, such as the one left for the setup flow', async () => {
      const wrapper = mountCard({ teamId: Number(mockTeamData.id) + 1 })
      await wrapper.find('[data-test="safe-import-address-input"]').setValue(DEFAULT_SAFE)

      expect(wrapper.find('[data-test="safe-import-already-registered"]').exists()).toBe(false)
      expect(
        wrapper.find('[data-test="inspect-safe-button"]').attributes('disabled')
      ).toBeUndefined()
    })
  })

  it('[AC-US-SAFE-001-13] shows the backend reason when the import is refused', async () => {
    mockCreateContract.error.value = Object.assign(
      new Error('Request failed with status code 409'),
      {
        response: {
          status: 409,
          data: { message: 'Safe address is already assigned to another team' }
        }
      }
    )
    const wrapper = mountCard()

    expect(wrapper.find('[data-test="safe-import-error"]').text()).toContain(
      'Safe address is already assigned to another team'
    )
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
