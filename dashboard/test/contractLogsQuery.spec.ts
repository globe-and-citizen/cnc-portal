import { defineComponent, h, nextTick, ref } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useContractLogsQuery } from '~/queries/contractLogs.query'

const mocks = vi.hoisted(() => ({ logs: vi.fn(), block: vi.fn() }))
vi.mock('@wagmi/vue', () => ({ useClient: () => ref({}) }))
vi.mock('viem/actions', () => ({ getLogs: mocks.logs, getBlockNumber: mocks.block }))

beforeEach(() => {
  mocks.logs.mockReset().mockResolvedValue([])
  mocks.block.mockReset().mockResolvedValue(2n)
  vi.stubGlobal('useRuntimeConfig', () => ({ public: { chainId: 137 } }))
})

describe('contract log query', () => {
  it('starts a separate chain query when the displayed contract address changes', async () => {
    const address = ref('0x1111111111111111111111111111111111111111')
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const wrapper = mount(defineComponent({
      setup() {
        useContractLogsQuery(address)
        return () => h('div')
      }
    }), { global: { plugins: [[VueQueryPlugin, { queryClient: client }]] } })
    await flushPromises()
    expect(mocks.logs).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ address: address.value, fromBlock: 0n }))
    address.value = '0x2222222222222222222222222222222222222222'
    await nextTick()
    await flushPromises()
    expect(mocks.logs).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ address: address.value, fromBlock: 0n }))
    expect(client.getQueryCache().getAll()).toHaveLength(2)
    wrapper.unmount()
  })
})
