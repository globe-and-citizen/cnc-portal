import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { BaseError, UserRejectedRequestError } from 'viem'
import CreateVesting from '@/components/sections/VestingView/forms/CreateVesting.vue'
import SelectMemberInput from '@/components/utils/SelectMemberInput.vue'
import { mockVestingWrites, resetContractMocks } from '@/tests/mocks'

describe('CreateVesting.vue — write feedback', () => {
  let wrapper: VueWrapper

  beforeEach(async () => {
    vi.clearAllMocks()
    resetContractMocks()
    wrapper = mount(CreateVesting, {
      global: { plugins: [createTestingPinia({ createSpy: vi.fn })] }
    })
    await wrapper.findComponent(SelectMemberInput).vm.$emit('selectMember', {
      name: 'Hank',
      address: '0x5555555555555555555555555555555555555555'
    })
    await wrapper.find('[data-test="total-amount"]').setValue('5')
    await flushPromises()
    await wrapper.find('[data-test="duration-12"]').trigger('click')
    await wrapper.find('form').trigger('submit')
    await flushPromises()
  })

  it('keeps a cancelled wallet request in context without creating a schedule', async () => {
    mockVestingWrites.addVesting.mutateAsync.mockRejectedValueOnce(
      new BaseError('reject', {
        cause: new UserRejectedRequestError(new Error('rejected'))
      })
    )

    await wrapper.find('[data-test="confirm-btn"]').trigger('click')
    await flushPromises()

    const alert = wrapper.find('[data-test="summary-error-alert"]')
    expect(alert.text()).toContain('wallet request was cancelled')
    expect(wrapper.find('[data-test="confirm-btn"]').exists()).toBe(true)
  })

  it('surfaces classified contract failures in the review step', async () => {
    mockVestingWrites.addVesting.mutateAsync.mockRejectedValueOnce(new Error('boom'))

    await wrapper.find('[data-test="confirm-btn"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-test="summary-error-alert"]').text()).toContain('boom')
  })
})
