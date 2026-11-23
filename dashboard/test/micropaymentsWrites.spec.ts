import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resolveFeeCollector } from '~/artifacts/feeCollectorRegistry'
import { useFeeCollectorVersion } from '~/composables/FeeCollector/useFeeCollectorVersion'
import { useSetFee } from '~/composables/FeeCollector/writes'

const mocks = vi.hoisted(() => ({ simulate: vi.fn(), write: vi.fn(), receipt: vi.fn() }))
vi.mock('@wagmi/core', () => ({
  simulateContract: mocks.simulate,
  writeContract: mocks.write,
  waitForTransactionReceipt: mocks.receipt
}))
vi.mock('@wagmi/vue', () => ({ useConfig: () => ({}) }))
vi.mock('@/utils', () => ({ log: { error: vi.fn() }, parseErrorV2: (error: Error) => error.message }))

beforeEach(() => {
  vi.clearAllMocks()
  useFeeCollectorVersion().selectedVersion.value = 'V2'
  mocks.simulate.mockResolvedValue({ request: { address: 'simulated' } })
  mocks.write.mockResolvedValue('0x1234')
  mocks.receipt.mockResolvedValue({ status: 'success', blockNumber: 10n })
})

describe('V2 FeeCollector transaction', () => {
  it('simulates, submits, confirms and invalidates reads for the V2 address', async () => {
    const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
    let mutation: ReturnType<typeof useSetFee>
    const wrapper = mount(defineComponent({
      setup() {
        mutation = useSetFee()
        return () => h('div')
      }
    }), {
      global: { plugins: [[VueQueryPlugin, { queryClient }]] }
    })
    await mutation!.mutateAsync({ args: ['BANK', 50] })
    expect(mocks.simulate).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      address: resolveFeeCollector('V2').address,
      abi: resolveFeeCollector('V2').abi,
      functionName: 'setFee',
      args: ['BANK', 50]
    }))
    expect(mocks.write).toHaveBeenCalledOnce()
    expect(mocks.receipt).toHaveBeenCalledOnce()
    expect(invalidate).toHaveBeenCalledOnce()
    const predicate = invalidate.mock.calls[0]![0]!.predicate!
    expect(predicate({ queryKey: ['readContract', { address: resolveFeeCollector('V2').address }] } as never)).toBe(true)
    expect(predicate({ queryKey: ['readContract', { address: resolveFeeCollector('V1').address }] } as never)).toBe(false)
    wrapper.unmount()
  })

  it('reports a rejected simulation without submitting a transaction', async () => {
    mocks.simulate.mockRejectedValue(new Error('rejected'))
    const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
    let mutation: ReturnType<typeof useSetFee>
    const wrapper = mount(defineComponent({
      setup() {
        mutation = useSetFee()
        return () => h('div')
      }
    }), {
      global: { plugins: [[VueQueryPlugin, { queryClient }]] }
    })
    await expect(mutation!.mutateAsync({ args: ['BANK', 50] })).rejects.toThrow('rejected')
    expect(mocks.write).not.toHaveBeenCalled()
    wrapper.unmount()
  })
})
