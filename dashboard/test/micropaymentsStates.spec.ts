import { computed, ref } from 'vue'
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import TokenHoldingsTable from '~/components/sections/FeeCollectorView/TokenHoldingsTable.vue'
import FeeConfigList from '~/components/sections/FeeCollectorView/FeeConfigList.vue'

const state = vi.hoisted(() => ({
  balanceError: { value: null as Error | null },
  configError: { value: null as Error | null },
  unknown: { value: [] as string[] },
  tokens: { value: [] as unknown[] }
}))
vi.mock('~/composables/useFeeCollector', () => ({
  useFeeCollector: () => ({
    tokens: state.tokens,
    unknownSupportedTokens: state.unknown,
    isLoading: { value: false },
    error: state.balanceError,
    formattedTotalUsd: { value: '$0.00' }
  })
}))
vi.mock('~/composables/FeeCollector/read', () => ({
  isFeeCollectorOwner: () => ref(true),
  useFeeConfigs: () => ({ data: ref(undefined), isLoading: ref(false), error: state.configError })
}))
vi.mock('~/composables/FeeCollector/writes', () => ({
  useWithdrawAll: () => ({ isPending: ref(false), isError: ref(false), error: ref(null), reset: vi.fn(), mutateAsync: vi.fn() })
}))
vi.mock('@/utils', () => ({ parseErrorV2: () => 'failure' }))
vi.mock('~/components/sections/FeeCollectorView/AddTokenSupportModal.vue', () => ({ default: { template: '<div />' } }))
vi.mock('~/components/sections/FeeCollectorView/RemoveTokenSupportModal.vue', () => ({ default: { template: '<div />' } }))
vi.mock('~/components/sections/FeeCollectorView/WithdrawModal.vue', () => ({ default: { template: '<div />' } }))
vi.mock('~/components/sections/FeeCollectorView/FeeConfigFormModal.vue', () => ({ default: { template: '<div />' } }))
vi.mock('~/components/sections/FeeCollectorView/FeeConfigAddActions.vue', () => ({ default: { template: '<div />' } }))

const stubs = {
  UCard: { template: '<div><slot name="header" /><slot /></div>' },
  UAlert: { props: ['title', 'description'], template: '<div>{{ title }} {{ description }}</div>' },
  UTable: { template: '<div><slot name="empty" /></div>' },
  UModal: { template: '<div><slot name="body" /><slot name="footer" /></div>' },
  UButton: { template: '<button><slot /></button>' },
  UIcon: true,
  UBadge: true
}

beforeEach(() => {
  state.balanceError = ref(null)
  state.configError = ref(null)
  state.unknown = ref([])
  state.tokens = ref([])
  vi.stubGlobal('useToast', () => ({ add: vi.fn() }))
  vi.stubGlobal('computed', computed)
})

describe('FeeCollector incomplete state disclosure', () => {
  it('discloses unknown supported tokens and their withdrawal implications', () => {
    state.unknown.value = ['0x1111111111111111111111111111111111111111']
    const wrapper = mount(TokenHoldingsTable, { global: { stubs } })
    expect(wrapper.text()).toContain('Some supported tokens are not displayed')
    expect(wrapper.text()).toContain('withdrawals still sweep them')
    wrapper.unmount()
  })

  it('reports failed balance reads rather than an empty token list', () => {
    state.balanceError.value = new Error('offline')
    const wrapper = mount(TokenHoldingsTable, { global: { stubs } })
    expect(wrapper.text()).toContain('Failed to load token balances')
    expect(wrapper.text()).not.toContain('No tokens available')
    wrapper.unmount()
  })

  it('reports failed fee configuration reads rather than an empty list', () => {
    state.configError.value = new Error('offline')
    const wrapper = mount(FeeConfigList, { global: { stubs } })
    expect(wrapper.text()).toContain('Failed to load fee configurations')
    expect(wrapper.text()).not.toContain('No fee configs available')
    wrapper.unmount()
  })
})
