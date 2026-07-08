import { describe, it, expect, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import CreateOfferingForm from '../CreateOfferingForm.vue'
import { mockFixedReturnReads, mockFixedReturnWrites, mockToast } from '@/tests/mocks'
import { SUPPORTED_TOKENS } from '@/constant'

function mountForm() {
  return mount(CreateOfferingForm)
}

async function fillBasicsAndContinue(wrapper: ReturnType<typeof mountForm>) {
  await wrapper.find('[data-test="offering-title-input"]').setValue('Riverside Note')
  await wrapper.find('[data-test="offering-principal-input"]').setValue('100000')
  await wrapper.find('[data-test="offering-rate-input"]').setValue('8')
  await wrapper.find('[data-test="offering-next-button"]').trigger('click')
  await flushPromises()
}

async function fillTermsAndContinue(wrapper: ReturnType<typeof mountForm>) {
  await wrapper.find('[data-test="offering-deadline-input"]').setValue('2030-01-01')
  await wrapper.find('[data-test="offering-next-button"]').trigger('click')
  await flushPromises()
}

// General access needs no further input — reaches the Access step (the last one).
async function goToLastStep(wrapper: ReturnType<typeof mountForm>) {
  await fillBasicsAndContinue(wrapper)
  await fillTermsAndContinue(wrapper)
}

describe('CreateOfferingForm.vue', () => {
  beforeEach(() => {
    mockFixedReturnReads.getSupportedTokens.data.value = [SUPPORTED_TOKENS[0]!.address]
    mockFixedReturnWrites.createLendingOffer.mutateAsync.mockClear()
    mockToast.add.mockClear()
  })

  it('labels the final-step button "Publish offering"', async () => {
    const wrapper = mountForm()
    await goToLastStep(wrapper)

    expect(wrapper.find('[data-test="offering-next-button"]').text()).toBe('Publish offering')
    expect(wrapper.find('[data-test="offering-collateral-alert"]').exists()).toBe(true)
  })

  it('shows the whitelist editor when specific-lender access is selected', async () => {
    const wrapper = mountForm()
    await goToLastStep(wrapper)

    await wrapper.find('[data-test="access-whitelist-button"]').trigger('click')

    expect(wrapper.find('[data-test="whitelist-add-lender"]').exists()).toBe(true)
  })

  it('does not advance past a step with invalid data', async () => {
    const wrapper = mountForm()
    // Title is required to be >= 3 chars — leave it blank and try to advance.
    await wrapper.find('[data-test="offering-next-button"]').trigger('click')
    await flushPromises()

    // Still on the Basics step — its title input is still present.
    expect(wrapper.find('[data-test="offering-title-input"]').exists()).toBe(true)
  })

  it('calls createLendingOffer with the mapped params and emits close on success', async () => {
    mockFixedReturnWrites.createLendingOffer.mutateAsync.mockResolvedValueOnce({ hash: '0x1' })
    const wrapper = mountForm()
    await goToLastStep(wrapper)

    await wrapper.find('[data-test="offering-next-button"]').trigger('click')
    await flushPromises()

    expect(mockFixedReturnWrites.createLendingOffer.mutateAsync).toHaveBeenCalledWith({
      args: [expect.objectContaining({ fundingTarget: 100000_000000n, interestRateBps: 800n })]
    })
    expect(mockToast.add).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Offering published successfully!', color: 'success' })
    )
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('shows the error alert and does not emit close when the transaction is rejected', async () => {
    mockFixedReturnWrites.createLendingOffer.mutateAsync.mockRejectedValueOnce(
      new Error('User rejected the request')
    )
    const wrapper = mountForm()
    await goToLastStep(wrapper)

    await wrapper.find('[data-test="offering-next-button"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-test="offering-error-alert"]').exists()).toBe(true)
    expect(wrapper.emitted('close')).toBeUndefined()
  })

  it('does not render the error alert before any submission attempt', () => {
    const wrapper = mountForm()
    expect(wrapper.find('[data-test="offering-error-alert"]').exists()).toBe(false)
  })
})
