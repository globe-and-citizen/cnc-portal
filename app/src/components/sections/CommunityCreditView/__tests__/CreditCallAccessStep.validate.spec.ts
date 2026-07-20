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
const ALICE = '0x2222222222222222222222222222222222222222'

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

  describe('mode 1 — no cap (capOn: false)', () => {
    it('passes regardless of whitelist amounts — no per-lender amount is required', () => {
      const wrapper = mountStep(
        makeForm({
          access: 'restricted',
          capOn: false,
          whitelist: [
            { username: 'Bob', address: BOB, amount: null },
            { username: 'Alice', address: ALICE, amount: 999999 }
          ]
        })
      )
      expect(wrapper.vm.validate()).toBe(true)
    })
  })

  describe('mode 2 — cap on (capOn: true)', () => {
    it('fails when a whitelisted lender has no amount set', async () => {
      const wrapper = mountStep(
        makeForm({
          access: 'restricted',
          capOn: true,
          cap: '10000',
          // custom: true — otherwise a default (cap-synced) lender never actually
          // stays null once the cap has a real value; only a custom one can.
          whitelist: [{ username: 'Bob', address: BOB, amount: null, custom: true }]
        })
      )
      expect(wrapper.vm.validate()).toBe(false)
      await wrapper.vm.$nextTick()
      expect(wrapper.find('[data-test="cc-whitelist-error"]').text()).toContain(
        'Set an amount for every whitelisted lender'
      )
    })

    it('passes once every lender has an amount that sums exactly to the target', () => {
      const wrapper = mountStep(
        makeForm({
          target: '25000',
          access: 'restricted',
          capOn: true,
          cap: '25000',
          whitelist: [{ username: 'Bob', address: BOB, amount: 25000 }]
        })
      )
      expect(wrapper.vm.validate()).toBe(true)
    })

    it('passes when whitelisted allocations exceed the principal target — a buffer against a non-participating lender', () => {
      const wrapper = mountStep(
        makeForm({
          target: '10000',
          access: 'restricted',
          capOn: true,
          cap: '10000',
          // custom: true so this amount isn't immediately re-synced to the cap value.
          whitelist: [{ username: 'Bob', address: BOB, amount: 15000, custom: true }]
        })
      )
      expect(wrapper.vm.validate()).toBe(true)
    })

    it('fails when whitelisted allocations fall short of the target — no uncapped lender to absorb the rest', async () => {
      const wrapper = mountStep(
        makeForm({
          target: '10000',
          access: 'restricted',
          capOn: true,
          cap: '10000',
          whitelist: [{ username: 'Bob', address: BOB, amount: 6000, custom: true }]
        })
      )
      expect(wrapper.vm.validate()).toBe(false)
      await wrapper.vm.$nextTick()
      expect(wrapper.find('[data-test="cc-whitelist-error"]').text()).toContain(
        'must add up to at least the target amount'
      )
    })

    it('fails and shows an error when the cap is left at zero', async () => {
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

    it('passes when a custom lender exceeds the cap, as long as the sum still hits the target exactly', () => {
      const wrapper = mountStep(
        makeForm({
          target: '10000',
          access: 'restricted',
          whitelist: [
            { username: 'Bob', address: BOB, amount: 8000, custom: true },
            { username: 'Alice', address: ALICE, amount: 2000, custom: true }
          ],
          capOn: true,
          cap: '3000'
        })
      )
      expect(wrapper.vm.validate()).toBe(true)
    })

    it('passes when every whitelisted amount stays within the cap and sums to the target', () => {
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
})
