import { ref } from 'vue'
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ContractLogs from '~/components/teams/ContractLogs.vue'

const state = vi.hoisted(() => ({
  data: { value: undefined as unknown }, loading: { value: false }, error: { value: false }, more: { value: false },
  next: vi.fn(), retry: vi.fn()
}))
vi.mock('~/queries/contractLogs.query', () => ({
  useContractLogsQuery: () => ({
    data: state.data, isLoading: state.loading, isError: state.error,
    isFetchingNextPage: ref(false), hasNextPage: state.more, fetchNextPage: state.next, refetch: state.retry
  })
}))
const stubs = {
  UAlert: { props: ['title', 'description'], template: '<div>{{ title }} {{ description }}</div>' },
  UButton: { emits: ['click'], template: '<button @click="$emit(\'click\')"><slot /></button>' },
  UIcon: true, UBadge: { template: '<span><slot /></span>' }, USkeleton: true
}
beforeEach(() => {
  state.data = ref({ pages: [{ rows: [], next: null, failed: false, scannedFrom: 0n }] })
  state.loading = ref(false)
  state.error = ref(false)
  state.more = ref(false)
  state.next.mockReset()
  state.retry.mockReset()
  vi.stubGlobal('useRuntimeConfig', () => ({ public: { chainId: 137 } }))
})

describe('contract logs history states', () => {
  it('distinguishes an incomplete empty scan from a complete empty history', async () => {
    state.more.value = true
    const wrapper = mount(ContractLogs, { props: { address: '0x1' }, global: { stubs } })
    expect(wrapper.text()).toContain('History is incomplete')
    expect(wrapper.text()).toContain('No events found in the scanned blocks')
    await wrapper.find('button').trigger('click')
    expect(state.next).toHaveBeenCalledOnce()
    state.more.value = false
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('No events found in the scanned history')
    wrapper.unmount()
  })

  it('shows partial failures and allows the remaining range to be retried', async () => {
    state.more.value = true
    state.data.value = { pages: [{ rows: [], next: { toBlock: '10', window: '2' }, failed: true, scannedFrom: null }] }
    const wrapper = mount(ContractLogs, { props: { address: '0x1' }, global: { stubs } })
    expect(wrapper.text()).toContain('Some history could not be loaded')
    expect(wrapper.text()).toContain('Retry remaining history')
    expect(wrapper.text()).toContain('No blocks have been scanned yet')
    await wrapper.find('button').trigger('click')
    expect(state.next).toHaveBeenCalledOnce()
    wrapper.unmount()
  })

  it('shows unknown events and deduplicates repeated transaction logs', () => {
    const row = { eventName: 'Unrecognized event', args: { data: '0x1234' }, blockNumber: 5n, transactionHash: `0x${'1'.repeat(64)}`, logIndex: 2, decoded: false }
    state.data.value = { pages: [{ rows: [row], next: null, failed: false }, { rows: [row], next: null, failed: false }] }
    const wrapper = mount(ContractLogs, { props: { address: '0x1' }, global: { stubs } })
    expect(wrapper.text().match(/Unrecognized event/g)).toHaveLength(1)
    expect(wrapper.text()).toContain('data: 0x1234')
    wrapper.unmount()
  })

  it('does not claim an empty history when no data is available', () => {
    state.data.value = undefined
    const wrapper = mount(ContractLogs, { props: { address: '' }, global: { stubs } })
    expect(wrapper.text()).toContain('Contract logs are not available yet')
    expect(wrapper.text()).not.toContain('No events found')
    wrapper.unmount()
  })

  it('keeps previously loaded rows visible when a refresh fails', async () => {
    state.error.value = true
    state.data.value = { pages: [{ rows: [{ eventName: 'Example', args: {}, blockNumber: 1n, transactionHash: null, logIndex: null }], next: null, failed: false }] }
    const wrapper = mount(ContractLogs, { props: { address: '0x1' }, global: { stubs } })
    expect(wrapper.text()).toContain('Example')
    expect(wrapper.text()).toContain('Some history could not be loaded')
    await wrapper.find('button').trigger('click')
    expect(state.retry).toHaveBeenCalledOnce()
    wrapper.unmount()
  })

  it('shows an initial failure and a retry action', async () => {
    state.data.value = undefined
    state.error.value = true
    const wrapper = mount(ContractLogs, { props: { address: '0x1' }, global: { stubs } })
    expect(wrapper.text()).toContain('Failed to load contract logs')
    await wrapper.find('button').trigger('click')
    expect(state.retry).toHaveBeenCalledOnce()
    wrapper.unmount()
  })
})
