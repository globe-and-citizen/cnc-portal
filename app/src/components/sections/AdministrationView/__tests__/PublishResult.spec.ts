import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref, nextTick, type Ref } from 'vue'
import PublishResult from '../PublishResult.vue'
import {
  useWriteContractFn,
  useWaitForTransactionReceiptFn,
  useQueryClientFn,
  mockWagmiCore,
  mockToastStore
} from '@/tests/mocks'
import { useTeamStore, useToastStore } from '@/stores'

// Prevent module-level constant validation and provide minimal addresses used by utils
vi.mock('@/constant', () => ({
  USDC_ADDRESS: '0x0000000000000000000000000000000000000001',
  USDT_ADDRESS: '0x0000000000000000000000000000000000000002',
  USDC_E_ADDRESS: '0x0000000000000000000000000000000000000003', // Added missing export
  zeroAddress: '0x0000000000000000000000000000000000000000',
  ELECTIONS_BEACON_ADDRESS: '0x0000000000000000000000000000000000000003',
  ELECTIONS_IMPL_ADDRESS: '0x0000000000000000000000000000000000000004'
}))
vi.mock('viem', async () => {
  const actual = await vi.importActual('viem')
  return {
    ...actual,
    encodeFunctionData: vi.fn(() => '0xdeadbeef')
  }
})

describe('PublishResult.vue', () => {
  type MockFn = ReturnType<typeof vi.fn>

  let publishResultsMock: MockFn
  let isPendingRef: Ref<boolean>
  let publishResultsHashRef: Ref<string | undefined>
  let waitErrorRef: Ref<unknown | null>
  let isWaitingRef: Ref<boolean>
  let isPublishedRef: Ref<boolean>
  let queryClientMock: { invalidateQueries: MockFn }

  beforeEach(() => {
    const localMockTeamStore = {
      currentTeam: {
        teamContracts: [{ type: 'Elections', address: '0xELECTIONSADDRESS000000000000000000000' }]
      },
      getContractAddressByType: (type: string) => {
        if (type === 'Elections') {
          return '0xELECTIONSADDRESS000000000000000000000'
        }
        return undefined
      }
    }
    vi.mocked(useToastStore).mockImplementation(() => mockToastStore)
    vi.mocked(useTeamStore).mockImplementation(
      () => localMockTeamStore as ReturnType<typeof useTeamStore>
    )

    publishResultsMock = vi.fn()
    isPendingRef = ref(false)
    publishResultsHashRef = ref<string | undefined>(undefined)
    useWriteContractFn.mockImplementation(
      (): {
        mutate: MockFn
        isPending: Ref<boolean>
        error: Ref<unknown | null>
        data: Ref<string | undefined>
      } => ({
        mutate: publishResultsMock,
        isPending: isPendingRef,
        error: ref(null),
        data: publishResultsHashRef
      })
    )

    waitErrorRef = ref<unknown | null>(null)
    isWaitingRef = ref(false)
    isPublishedRef = ref(false)
    useWaitForTransactionReceiptFn.mockImplementation(
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
    useQueryClientFn.mockImplementation(() => queryClientMock)
    mockWagmiCore.estimateGas.mockImplementation(async () => ({
      gas: 21000n
    }))
  })

  it('calls estimateGas and publishResults when button clicked', async () => {
    const wrapper = mount(PublishResult, {
      props: { electionId: 42 },
      global: {
        stubs: ['UButton']
      }
    })

    const btn = wrapper.find('[data-test="create-election-button"]')
    expect(btn.exists()).toBe(true)

    await btn.trigger('click')
    await nextTick()

    expect(mockWagmiCore.estimateGas).toHaveBeenCalled()
    expect(publishResultsMock).toHaveBeenCalledWith({
      address: '0xELECTIONSADDRESS000000000000000000000',
      abi: expect.any(Array),
      functionName: 'publishResults',
      args: [BigInt(42)]
    })
  })

  it('shows success toast and invalidates queries when receipt is published', async () => {
    const wrapper = mount(PublishResult, {
      props: { electionId: 7 },
      global: { stubs: ['UButton'] }
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

    expect(mockToastStore.addSuccessToast).toHaveBeenCalledWith(
      'Election results published successfully!'
    )
    expect(queryClientMock.invalidateQueries).toHaveBeenCalled()
  })

  it('shows error toast when estimateGas throws', async () => {
    mockWagmiCore.estimateGas.mockImplementationOnce(() => {
      throw new Error('gas failed')
    })

    const wrapper = mount(PublishResult, {
      props: { electionId: 99 },
      global: { stubs: ['UButton'] }
    })

    await wrapper.find('[data-test="create-election-button"]').trigger('click')
    await nextTick()

    expect(mockToastStore.addErrorToast).toHaveBeenCalled()
  })
})
