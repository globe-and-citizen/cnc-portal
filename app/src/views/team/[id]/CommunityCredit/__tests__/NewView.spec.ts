import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import type { CreditRound } from '@/types'

// vue-router is globally mocked (composables.setup.ts); useRouter().push is
// mockRouterPush and useRoute() reads the shared reactive mockRoute.
import {
  mockRouterPush,
  setMockRoute,
  useQueryClientFn,
  mockInvalidateQueries,
  mockFixedReturnWrites,
  mockWagmiCore
} from '@/tests/mocks'

// The Community Credit store is the contract-backed read hub. Mocked the same way as
// communityCreditViews.spec.ts (split out to stay under the max-lines cap there).
const { store } = vi.hoisted(() => {
  const store = {
    hasContract: true,
    isOwner: true,
    rounds: [] as CreditRound[],
    members: [] as unknown[]
  }
  return { store }
})

vi.mock('@/stores/communityCredit', () => ({
  useCommunityCreditStore: () => store
}))

// NewView persists off-chain metadata through this mutation — stub it so mounting the
// wizard doesn't reach the real query layer.
vi.mock('@/queries/fixedReturnOffering.queries', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useCreateFixedReturnOfferingMutation: () => ({
    mutateAsync: vi.fn(),
    isPending: { value: false }
  })
}))

import NewView from '../NewView.vue'

describe('NewView', () => {
  beforeEach(() => {
    mockRouterPush.mockClear()
    mockInvalidateQueries.mockClear()
    mockWagmiCore.readContract.mockReset()
    useQueryClientFn.mockReturnValue({
      invalidateQueries: mockInvalidateQueries,
      getQueryData: vi.fn(),
      setQueryData: vi.fn(),
      removeQueries: vi.fn()
    })
    setMockRoute({ params: { id: '1' } })
  })

  it('renders the credit-call wizard', () => {
    const wrapper = mount(NewView)
    expect(wrapper.text()).toContain('New credit call')
    expect(wrapper.find('[data-test="cc-name"]').exists()).toBe(true)
  })

  it('blocks advancing past Basics on a too-short name, then clears once fixed', async () => {
    const wrapper = mount(NewView)

    await wrapper.find('[data-test="cc-name"]').setValue('Q3')
    await wrapper.find('[data-test="cc-next"]').trigger('click')
    expect(wrapper.find('[data-test="cc-name-error"]').text()).toContain('at least 3 characters')
    expect(wrapper.find('[data-test="cc-term-30"]').exists()).toBe(false) // still on Basics

    await wrapper.find('[data-test="cc-name"]').setValue('Q3 runway bridge')
    await wrapper.find('[data-test="cc-next"]').trigger('click')
    expect(wrapper.find('[data-test="cc-name-error"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="cc-term-30"]').exists()).toBe(true)
  })

  it('blocks advancing past Basics with a non-positive target', async () => {
    const wrapper = mount(NewView)

    await wrapper.find('[data-test="cc-name"]').setValue('Q3 runway bridge')
    await wrapper.find('[data-test="cc-target"]').setValue('0')
    await wrapper.find('[data-test="cc-next"]').trigger('click')

    expect(wrapper.find('[data-test="cc-target-error"]').text()).toContain('greater than 0')
  })

  it('blocks advancing past Terms with a deadline in the past', async () => {
    const wrapper = mount(NewView)

    await wrapper.find('[data-test="cc-name"]').setValue('Q3 runway bridge')
    await wrapper.find('[data-test="cc-next"]').trigger('click') // Basics → Terms
    // The deadline field is a UCalendar behind a popover button, not a plain input —
    // same interaction CreditCallTermsStep.spec.ts uses to drive it in isolation.
    const calendar = wrapper.findComponent({ name: 'UCalendar' })
    await calendar.vm.$emit('update:modelValue', { year: 2020, month: 1, day: 1 })
    await wrapper.find('[data-test="cc-next"]').trigger('click') // blocked on Terms

    expect(wrapper.find('[data-test="cc-deadline-error"]').text()).toContain(
      'cannot be in the past'
    )
    expect(wrapper.find('[data-test="cc-term-30"]').exists()).toBe(true) // still on Terms
  })

  it('creates the offer on-chain and returns to the list on publish', async () => {
    mockWagmiCore.readContract.mockResolvedValue(1n) // totalOfferings after create
    const wrapper = mount(NewView)

    // Basics → Terms → Access → Publish
    await wrapper.find('[data-test="cc-name"]').setValue('Q3 runway bridge')
    await wrapper.find('[data-test="cc-next"]').trigger('click')
    await wrapper.find('[data-test="cc-next"]').trigger('click')
    await wrapper.find('[data-test="cc-next"]').trigger('click')
    await flushPromises()

    expect(mockFixedReturnWrites.createLendingOffer.mutateAsync).toHaveBeenCalled()
    expect(mockRouterPush).toHaveBeenLastCalledWith(
      expect.objectContaining({ name: 'community-credit' })
    )
  })

  it('surfaces an error and stays on the wizard when publishing fails', async () => {
    mockWagmiCore.readContract.mockResolvedValue(1n)
    mockFixedReturnWrites.createLendingOffer.mutateAsync.mockRejectedValueOnce(new Error('boom'))
    const wrapper = mount(NewView)

    await wrapper.find('[data-test="cc-name"]').setValue('Q3 runway bridge')
    await wrapper.find('[data-test="cc-next"]').trigger('click')
    await wrapper.find('[data-test="cc-next"]').trigger('click')
    await wrapper.find('[data-test="cc-next"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-test="cc-error"]').exists()).toBe(true)
  })
})
