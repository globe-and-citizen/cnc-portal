import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { reactive } from 'vue'
import OfferingBasicsStep from '../OfferingBasicsStep.vue'
import { mockFixedReturnReads } from '@/tests/mocks'
import { SUPPORTED_TOKENS } from '@/constant'
import type { OfferingForm } from '@/types'

const USDC = SUPPORTED_TOKENS.find((t) => t.symbol === 'USDC')!
const USDCe = SUPPORTED_TOKENS.find((t) => t.symbol === 'USDCe')!

function baseForm(overrides: Partial<OfferingForm> = {}): OfferingForm {
  return {
    title: '',
    purpose: '',
    principal: 0,
    rate: 0,
    termValue: 12,
    termUnit: 'months',
    startDate: '',
    deadline: '',
    access: 'general',
    capOn: false,
    cap: 0,
    token: undefined,
    ...overrides
  }
}

function mountStep(form: OfferingForm) {
  return mount(OfferingBasicsStep, { props: { form: reactive(form) } })
}

describe('OfferingBasicsStep.vue', () => {
  beforeEach(() => {
    mockFixedReturnReads.getSupportedTokens.data.value = []
  })

  it('shows no token options when the contract has none registered', () => {
    const wrapper = mountStep(baseForm())
    const select = wrapper.find('[data-test="amount-token-select"]')
    expect(select.exists()).toBe(true)
  })

  it('resets the form token to the first supported option once tokens load', async () => {
    const form = baseForm({ token: undefined })
    mountStep(form)

    mockFixedReturnReads.getSupportedTokens.data.value = [USDC.address]
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(form.token).toBe('USDC')
  })

  it('resets a stale token selection that is no longer in the supported list', async () => {
    const form = baseForm({ token: 'USDCe' })
    mountStep(form)

    mockFixedReturnReads.getSupportedTokens.data.value = [USDC.address]
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(form.token).toBe('USDC')
  })

  it('keeps the current token selection when it is still supported', async () => {
    const form = baseForm({ token: 'USDCe' })
    mountStep(form)

    mockFixedReturnReads.getSupportedTokens.data.value = [USDC.address, USDCe.address]
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(form.token).toBe('USDCe')
  })

  it('binds the title input to the form', async () => {
    const form = baseForm()
    const wrapper = mountStep(form)

    await wrapper.find('[data-test="offering-title-input"]').setValue('Riverside Note')
    expect(form.title).toBe('Riverside Note')
  })

  it('binds the principal input to the form as a number', async () => {
    const form = baseForm()
    const wrapper = mountStep(form)

    await wrapper.find('[data-test="offering-principal-input"]').setValue('50000')
    expect(form.principal).toBe(50000)
  })
})
