import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { reactive } from 'vue'
import type { CreditCallForm } from '@/types'
import CreditCallAccessStep from '../CreditCallAccessStep.vue'

function makeForm(overrides: Partial<CreditCallForm> = {}): CreditCallForm {
  return reactive({
    name: '',
    desc: '',
    target: '25000',
    token: 'USDC',
    rate: '6',
    period: 90,
    periodMode: 'preset',
    periodVal: '90',
    periodUnit: 'days',
    deadline: '2026-07-31',
    access: 'everyone',
    whitelist: [],
    capOn: false,
    cap: '10000',
    ...overrides
  })
}

function mountStep(form: CreditCallForm) {
  return mount(CreditCallAccessStep, { props: { form } })
}

// mockTeamStore defaults to Member 1 (0x1234…7890), Member 2 (0x0987…4321) and Bob
// (0x1111…1111) — same searchable-member source WhitelistEditor already uses for Issue Note.
const BOB = '0x1111111111111111111111111111111111111111'

describe('CreditCallAccessStep validate()', () => {
  it('passes for the default "everyone" access with no cap', () => {
    const wrapper = mountStep(makeForm())
    expect(wrapper.vm.validate()).toBe(true)
  })

  it('fails and shows an error when "restricted" is chosen with nobody added', async () => {
    const wrapper = mountStep(makeForm({ access: 'restricted' }))
    expect(wrapper.vm.validate()).toBe(false)
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-test="cc-whitelist-error"]').text()).toContain(
      'Add at least one lender'
    )
  })

  it('fails when a whitelisted lender has no amount set', async () => {
    const wrapper = mountStep(
      makeForm({
        access: 'restricted',
        whitelist: [{ username: 'Bob', address: BOB, amount: null }]
      })
    )
    expect(wrapper.vm.validate()).toBe(false)
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-test="cc-whitelist-error"]').text()).toContain(
      'Set an amount for every whitelisted lender'
    )
  })

  it('passes for "restricted" access once a lender has an amount set', () => {
    const wrapper = mountStep(
      makeForm({
        access: 'restricted',
        whitelist: [{ username: 'Bob', address: BOB, amount: 25000 }]
      })
    )
    expect(wrapper.vm.validate()).toBe(true)
  })

  it('fails when whitelisted allocations exceed the principal target', async () => {
    const wrapper = mountStep(
      makeForm({
        target: '10000',
        access: 'restricted',
        whitelist: [{ username: 'Bob', address: BOB, amount: 15000 }]
      })
    )
    expect(wrapper.vm.validate()).toBe(false)
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-test="cc-whitelist-error"]').text()).toContain(
      'must add up to exactly the target amount'
    )
  })

  it('fails when whitelisted allocations fall short of the target — the round could never be funded on-chain', async () => {
    const wrapper = mountStep(
      makeForm({
        target: '10000',
        access: 'restricted',
        whitelist: [{ username: 'Bob', address: BOB, amount: 6000 }]
      })
    )
    expect(wrapper.vm.validate()).toBe(false)
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-test="cc-whitelist-error"]').text()).toContain(
      'must add up to exactly the target amount'
    )
  })

  it('fails and shows an error when the cap is enabled but left at zero', async () => {
    const wrapper = mountStep(makeForm({ capOn: true, cap: '0' }))
    expect(wrapper.vm.validate()).toBe(false)
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-test="cc-cap-error"]').text()).toContain(
      'Enter a maximum amount per lender'
    )
  })

  it('fails and shows an error when the cap exceeds the principal target', async () => {
    const wrapper = mountStep(makeForm({ target: '10000', capOn: true, cap: '20000' }))
    expect(wrapper.vm.validate()).toBe(false)
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-test="cc-cap-error"]').text()).toContain(
      'cannot exceed the principal target'
    )
  })

  it("fails when a whitelisted lender's custom amount exceeds the cap", async () => {
    const wrapper = mountStep(
      makeForm({
        access: 'restricted',
        whitelist: [{ username: 'Bob', address: BOB, amount: 5000 }],
        capOn: true,
        cap: '3000'
      })
    )
    expect(wrapper.vm.validate()).toBe(false)
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-test="cc-cap-error"]').text()).toContain(
      'exceed the per-lender cap'
    )
  })

  it('passes when every whitelisted amount stays within the cap', () => {
    const wrapper = mountStep(
      makeForm({
        target: '5000',
        access: 'restricted',
        whitelist: [{ username: 'Bob', address: BOB, amount: 5000 }],
        capOn: true,
        cap: '5000'
      })
    )
    expect(wrapper.vm.validate()).toBe(true)
  })
})
