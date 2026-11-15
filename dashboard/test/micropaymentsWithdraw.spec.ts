import { ref } from 'vue'
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import WithdrawModal from '~/components/sections/FeeCollectorView/WithdrawModal.vue'

const mocks = vi.hoisted(() => ({
  unknown: { value: [] as string[] },
  error: { value: null as Error | null },
  mutate: vi.fn()
}))
vi.mock('~/composables/useFeeCollector', () => ({
  useFeeCollector: () => ({
    tokens: ref([]),
    unknownSupportedTokens: mocks.unknown,
    isLoading: ref(false),
    error: mocks.error,
    formattedTotalUsd: ref('$0.00')
  })
}))
vi.mock('~/composables/FeeCollector/read', () => ({ isFeeCollectorOwner: () => ref(true) }))
vi.mock('~/composables/FeeCollector/writes', () => ({
  useWithdrawAll: () => ({
    isPending: ref(false), isError: ref(false), error: ref(null), reset: vi.fn(), mutateAsync: mocks.mutate
  })
}))
vi.mock('@/utils', () => ({ parseErrorV2: () => 'failure' }))

const stubs = {
  UModal: { template: '<div><slot name="body" /><slot name="footer" /></div>' },
  UButton: { props: ['disabled'], template: '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>' },
  UAlert: { props: ['title', 'description'], template: '<div>{{ title }} {{ description }}</div>' },
  UAvatar: true,
  UIcon: true
}

beforeEach(() => {
  mocks.unknown = ref([])
  mocks.error = ref(null)
  mocks.mutate.mockReset().mockResolvedValue({})
  vi.stubGlobal('useToast', () => ({ add: vi.fn() }))
})

describe('FeeCollector withdrawal disclosure', () => {
  it('allows a sweep when only unsupported-in-the-dashboard token metadata exists', async () => {
    mocks.unknown.value = ['0x1111111111111111111111111111111111111111']
    const wrapper = mount(WithdrawModal, { global: { stubs } })
    expect(wrapper.text()).toContain('Unrecognized tokens are not listed below')
    expect(wrapper.text()).not.toContain('Nothing to withdraw')
    const confirm = wrapper.findAll('button').find(button => button.text() === 'Withdraw all')!
    expect(confirm.attributes('disabled')).toBeUndefined()
    await confirm.trigger('click')
    expect(mocks.mutate).toHaveBeenCalledWith({ args: [] })
    wrapper.unmount()
  })

  it('prevents confirmation when balance reads fail', () => {
    mocks.error.value = new Error('offline')
    const wrapper = mount(WithdrawModal, { global: { stubs } })
    expect(wrapper.text()).toContain('Failed to load balances')
    expect(wrapper.findAll('button').find(button => button.text() === 'Withdraw all')!.attributes('disabled')).toBeDefined()
    wrapper.unmount()
  })
})
