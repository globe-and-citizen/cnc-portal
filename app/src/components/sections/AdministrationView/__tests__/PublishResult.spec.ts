import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { nextTick } from 'vue'
import PublishResult from '../PublishResult.vue'
import {
  mockElectionsWrites,
  resetContractMocks,
  useQueryClientFn,
  mockWagmiCore
} from '@/tests/mocks'
import { useTeamStore } from '@/stores'

vi.mock('@/constant', () => ({
  USDC_ADDRESS: '0x0000000000000000000000000000000000000001',
  USDT_ADDRESS: '0x0000000000000000000000000000000000000002',
  USDC_E_ADDRESS: '0x0000000000000000000000000000000000000003',
  zeroAddress: '0x0000000000000000000000000000000000000000',
  ELECTIONS_BEACON_ADDRESS: '0x0000000000000000000000000000000000000003',
  ELECTIONS_IMPL_ADDRESS: '0x0000000000000000000000000000000000000004'
}))
vi.mock('viem', async () => {
  const actual = await vi.importActual<typeof import('viem')>('viem')
  return {
    ...actual,
    encodeFunctionData: vi.fn(() => '0xdeadbeef')
  }
})

type PublishOptions = {
  onSuccess?: () => void
  onError?: (e: unknown) => void
}

describe('PublishResult.vue', () => {
  const publish = mockElectionsWrites.publishResults
  let queryClientMock: ReturnType<typeof useQueryClientFn>

  beforeEach(() => {
    vi.clearAllMocks()
    resetContractMocks()

    vi.mocked(useTeamStore).mockImplementation(
      () =>
        ({
          currentTeam: {
            teamContracts: [
              { type: 'Elections', address: '0xELECTIONSADDRESS000000000000000000000' }
            ]
          },
          getContractAddressByType: (type: string) =>
            type === 'Elections' ? '0xELECTIONSADDRESS000000000000000000000' : undefined
        }) as ReturnType<typeof useTeamStore>
    )

    queryClientMock = {
      invalidateQueries: vi.fn(async () => undefined),
      getQueryData: vi.fn(() => undefined),
      setQueryData: vi.fn(() => undefined),
      removeQueries: vi.fn(() => undefined)
    }
    useQueryClientFn.mockImplementation(() => queryClientMock)
    mockWagmiCore.estimateGas.mockImplementation(async () => ({ gas: 21000n }))
  })

  it('calls estimateGas and publishResults when button clicked', async () => {
    const wrapper = mount(PublishResult, { props: { electionId: 42 } })

    await wrapper.find('[data-test="create-election-button"]').trigger('click')
    await nextTick()

    expect(mockWagmiCore.estimateGas).toHaveBeenCalled()
    expect(publish.mutate).toHaveBeenCalledWith(
      { args: [BigInt(42)] },
      expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) })
    )
  })

  it('invalidates queries when mutation resolves', async () => {
    publish.mutate.mockImplementationOnce((_v: unknown, opts?: PublishOptions) => {
      opts?.onSuccess?.()
    })
    const wrapper = mount(PublishResult, { props: { electionId: 7 } })

    await wrapper.find('[data-test="create-election-button"]').trigger('click')
    await nextTick()
    await Promise.resolve()
    expect(queryClientMock.invalidateQueries).toHaveBeenCalled()
  })

  it('runs the onError path without scheduling a mutation re-run', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    publish.mutate.mockImplementationOnce((_v: unknown, opts?: PublishOptions) => {
      opts?.onError?.(new Error('mutation failed'))
    })
    const wrapper = mount(PublishResult, { props: { electionId: 3 } })

    await wrapper.find('[data-test="create-election-button"]').trigger('click')
    await nextTick()
    expect(consoleErrorSpy).toHaveBeenCalled()
    consoleErrorSpy.mockRestore()
  })

  it('short-circuits before mutation when estimateGas rejects', async () => {
    mockWagmiCore.estimateGas.mockRejectedValueOnce(new Error('insufficient funds'))
    const wrapper = mount(PublishResult, { props: { electionId: 11 } })

    await wrapper.find('[data-test="create-election-button"]').trigger('click')
    await nextTick()
    expect(publish.mutate).not.toHaveBeenCalled()
  })

  it('reflects mutation isPending on the button loading state', async () => {
    publish.isPending.value = true
    const wrapper = mount(PublishResult, { props: { electionId: 1 } })
    expect(wrapper.findComponent({ name: 'UButton' }).props('loading')).toBe(true)
  })
})
