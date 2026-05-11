import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, type VueWrapper, flushPromises } from '@vue/test-utils'
import VestingFlow from '@/components/sections/VestingView/VestingFlow.vue'
import { createTestingPinia } from '@pinia/testing'
import { ref } from 'vue'
import VestingActions from '@/components/sections/VestingView/VestingActions.vue'
import { mockVestingWrites, mockTeamStore, mockUserStore } from '@/tests/mocks'

const mockReloadKey = ref(0)
const TEAM_ID = 1n
const MEMBER = mockUserStore.address

// Active vesting tuple shaped like the on-chain return.
const activeVestings = ref([
  [MEMBER],
  [
    {
      start: BigInt(Math.floor(Date.now() / 1000) - 3600),
      duration: BigInt(30 * 86400),
      cliff: 0n,
      totalAmount: BigInt(10e18),
      released: BigInt(2e18),
      active: true
    }
  ]
])

vi.mock('@/composables/vesting/reads', () => ({
  useVestingAddress: vi.fn(() => ref('0x1000000000000000000000000000000000000001')),
  useVestingGetTeamVestingsWithMembers: vi.fn(() => ({
    data: activeVestings,
    error: ref(null),
    refetch: vi.fn()
  })),
  useVestingGetTeamAllArchivedVestingsFlat: vi.fn(() => ({
    data: ref(null),
    error: ref(null),
    refetch: vi.fn()
  }))
}))

vi.mock('@/composables/investor/reads', () => ({
  useInvestorSymbol: vi.fn(() => ({ data: ref('SHR') }))
}))

type MutateOptions = {
  onSuccess?: () => void | Promise<void>
  onError?: (err: Error) => void | Promise<void>
}

describe('VestingFlow.vue', () => {
  let wrapper: VueWrapper

  const mountComponent = () =>
    mount(VestingFlow, {
      props: {
        reloadKey: mockReloadKey.value
      },
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })]
      }
    })

  beforeEach(() => {
    vi.clearAllMocks()
    mockVestingWrites.stopVesting.mutate.mockReset()
    mockVestingWrites.release.mutate.mockReset()
    mockTeamStore.currentTeam = {
      ...mockTeamStore.currentTeam,
      id: Number(TEAM_ID),
      ownerAddress: MEMBER
    }
    wrapper = mountComponent()
  })

  describe('Rendering', () => {
    it('displays vesting table with correct columns', () => {
      const table = wrapper.find('[data-test="vesting-overview"]')
      expect(table.exists()).toBe(true)
    })
  })

  describe('Vesting Actions', () => {
    it('emits reload event when actions complete', async () => {
      const actions = wrapper.findComponent(VestingActions)
      await actions.vm.$emit('reload')
      expect(wrapper.emitted('reload')).toBeTruthy()
    })
  })

  describe('Stop vesting', () => {
    it('calls stopVesting mutate with member + teamId when the row stop button is clicked', async () => {
      await flushPromises()
      const stopBtn = wrapper.find('[data-test="stop-btn"]')
      expect(stopBtn.exists()).toBe(true)
      await stopBtn.trigger('click')

      expect(mockVestingWrites.stopVesting.mutate).toHaveBeenCalledWith(
        { args: [MEMBER, TEAM_ID] },
        expect.objectContaining({
          onSuccess: expect.any(Function),
          onError: expect.any(Function)
        })
      )
    })

    it('emits reload when stop succeeds via its onSuccess callback', async () => {
      mockVestingWrites.stopVesting.mutate.mockImplementation(
        (_vars: unknown, opts?: MutateOptions) => opts?.onSuccess?.()
      )
      await flushPromises()
      await wrapper.find('[data-test="stop-btn"]').trigger('click')
      expect(wrapper.emitted('reload')).toBeTruthy()
    })

    it('logs an error and does not emit reload when stop fails', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockVestingWrites.stopVesting.mutate.mockImplementation(
        (_vars: unknown, opts?: MutateOptions) => opts?.onError?.(new Error('stop boom'))
      )
      await flushPromises()
      await wrapper.find('[data-test="stop-btn"]').trigger('click')
      expect(errorSpy).toHaveBeenCalledWith('stop vesting error', expect.any(Error))
      expect(wrapper.emitted('reload')).toBeFalsy()
      errorSpy.mockRestore()
    })
  })

  describe('Release vesting', () => {
    it('calls release mutate with teamId when the row release button is clicked', async () => {
      await flushPromises()
      const releaseBtn = wrapper.find('[data-test="release-btn"]')
      expect(releaseBtn.exists()).toBe(true)
      await releaseBtn.trigger('click')

      expect(mockVestingWrites.release.mutate).toHaveBeenCalledWith(
        { args: [TEAM_ID] },
        expect.objectContaining({
          onSuccess: expect.any(Function),
          onError: expect.any(Function)
        })
      )
    })

    it('emits reload when release succeeds via its onSuccess callback', async () => {
      mockVestingWrites.release.mutate.mockImplementation((_vars: unknown, opts?: MutateOptions) =>
        opts?.onSuccess?.()
      )
      await flushPromises()
      await wrapper.find('[data-test="release-btn"]').trigger('click')
      expect(wrapper.emitted('reload')).toBeTruthy()
    })

    it('logs an error and does not emit reload when release fails', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockVestingWrites.release.mutate.mockImplementation((_vars: unknown, opts?: MutateOptions) =>
        opts?.onError?.(new Error('release boom'))
      )
      await flushPromises()
      await wrapper.find('[data-test="release-btn"]').trigger('click')
      expect(errorSpy).toHaveBeenCalledWith('release vesting error', expect.any(Error))
      expect(wrapper.emitted('reload')).toBeFalsy()
      errorSpy.mockRestore()
    })
  })
})
