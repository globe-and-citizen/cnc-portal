import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref, nextTick, type Ref } from 'vue'
import PublishResult from '../PublishResult.vue'

// Mock modules before component use
vi.mock('@/stores', () => ({
  useTeamStore: vi.fn(),
  useToastStore: vi.fn()
}))
vi.mock('@wagmi/vue', () => ({
  createConfig: vi.fn(),
  http: vi.fn(),
  useWriteContract: vi.fn(),
  useWaitForTransactionReceipt: vi.fn()
}))
// Prevent module-level constant validation and provide minimal addresses used by utils
vi.mock('@/constant', () => ({
  USDC_ADDRESS: '0x0000000000000000000000000000000000000001',
  USDT_ADDRESS: '0x0000000000000000000000000000000000000002',
  zeroAddress: '0x0000000000000000000000000000000000000000',
  ELECTIONS_BEACON_ADDRESS: '0x0000000000000000000000000000000000000003',
  ELECTIONS_IMPL_ADDRESS: '0x0000000000000000000000000000000000000004'
}))
vi.mock('@tanstack/vue-query', () => ({
  useQueryClient: vi.fn()
}))
vi.mock('@wagmi/core', () => ({
  estimateGas: vi.fn()
}))
vi.mock('viem', async () => {
  const actual = await vi.importActual('viem')
  return {
    ...actual,
    encodeFunctionData: vi.fn(() => '0xdeadbeef')
  }
})

import { useTeamStore, useToastStore } from '@/stores'
import { useWriteContract, useWaitForTransactionReceipt } from '@wagmi/vue'
import { useQueryClient } from '@tanstack/vue-query'
import { estimateGas } from '@wagmi/core'

describe('PublishResult.vue', () => {
  type MockFn = ReturnType<typeof vi.fn>

  let mockToast: {
    addErrorToast: MockFn
    addSuccessToast: MockFn
  }

  let mockTeamStore: {
    currentTeam: {
      teamContracts: Array<{ type: string; address: string }>
    }
  }

  let publishResultsMock: MockFn
  let isPendingRef: Ref<boolean>
  let publishResultsHashRef: Ref<string | undefined>
  let waitErrorRef: Ref<unknown | null>
  let isWaitingRef: Ref<boolean>
  let isPublishedRef: Ref<boolean>
  let queryClientMock: { invalidateQueries: MockFn }

  beforeEach(() => {
    mockToast = {
      addErrorToast: vi.fn(),
      addSuccessToast: vi.fn()
    }
    mockTeamStore = {
      currentTeam: {
        teamContracts: [{ type: 'Elections', address: '0xELECTIONSADDRESS000000000000000000000' }]
      }
    }
    ;(useToastStore as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => mockToast)
    ;(useTeamStore as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => mockTeamStore)

    publishResultsMock = vi.fn()
    isPendingRef = ref(false)
    publishResultsHashRef = ref<string | undefined>(undefined)
    ;(useWriteContract as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      (): {
        writeContract: MockFn
        isPending: Ref<boolean>
        error: Ref<unknown | null>
        data: Ref<string | undefined>
      } => ({
        writeContract: publishResultsMock,
        isPending: isPendingRef,
        error: ref(null),
        data: publishResultsHashRef
      })
    )

    waitErrorRef = ref<unknown | null>(null)
    isWaitingRef = ref(false)
    isPublishedRef = ref(false)
    ;(useWaitForTransactionReceipt as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      (): {
        error: Ref<unknown | null>
        isLoading: Ref<boolean>
        isSuccess: Ref<boolean>
      } => ({
        error: waitErrorRef,
        isLoading: isWaitingRef,
        isSuccess: isPublishedRef
      })
    )

    queryClientMock = {
      invalidateQueries: vi.fn()
    }
    ;(useQueryClient as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      () => queryClientMock
    )
    ;(estimateGas as unknown as ReturnType<typeof vi.fn>).mockImplementation(async () => ({
      gas: 21000n
    }))
  })

  it('calls estimateGas and publishResults when button clicked', async () => {
    const wrapper = mount(PublishResult, {
      props: { electionId: 42 },
      global: {
        stubs: ['ButtonUI']
      }
    })

    const btn = wrapper.find('[data-test="create-election-button"]')
    expect(btn.exists()).toBe(true)

    await btn.trigger('click')
    await nextTick()

    expect(estimateGas).toHaveBeenCalled()
    expect(publishResultsMock).toHaveBeenCalledWith({
      address:
        mockTeamStore.currentTeam.teamContracts.find(
          (c: { type: string; address: string }) => c.type === 'Elections'
        )?.address ?? '',
      abi: expect.any(Array),
      functionName: 'publishResults',
      args: [BigInt(42)]
    })
  })

  it('shows success toast and invalidates queries when receipt is published', async () => {
    const wrapper = mount(PublishResult, {
      props: { electionId: 7 },
      global: { stubs: ['ButtonUI'] }
    })

    // simulate click to trigger publish
    await wrapper.find('[data-test="create-election-button"]').trigger('click')
    await nextTick()

    // Simulate publishResultsHash being set and receipt success
    publishResultsHashRef.value = '0xhash'
    isPublishedRef.value = true

    // need nextTick / flush for watchers
    await nextTick()
    await Promise.resolve()

    expect(mockToast.addSuccessToast).toHaveBeenCalledWith(
      'Election results published successfully!'
    )
    expect(queryClientMock.invalidateQueries).toHaveBeenCalled()
  })

  it('shows error toast when estimateGas throws', async () => {
    ;(estimateGas as unknown as ReturnType<typeof vi.fn>).mockImplementationOnce(() => {
      throw new Error('gas failed')
    })

    const wrapper = mount(PublishResult, {
      props: { electionId: 99 },
      global: { stubs: ['ButtonUI'] }
    })

    await wrapper.find('[data-test="create-election-button"]').trigger('click')
    await nextTick()

    expect(mockToast.addErrorToast).toHaveBeenCalled()
  })
})
