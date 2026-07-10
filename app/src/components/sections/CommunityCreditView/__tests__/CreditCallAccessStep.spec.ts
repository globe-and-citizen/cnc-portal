import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick, reactive } from 'vue'
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

describe('CreditCallAccessStep', () => {
  describe('access mode picker', () => {
    it('toggles form.access and its aria-checked state when a row is clicked', async () => {
      const form = makeForm()
      const wrapper = mountStep(form)

      const everyone = wrapper.find('[data-test="access-everyone-button"]')
      const restricted = wrapper.find('[data-test="access-restricted-button"]')
      expect(everyone.attributes('aria-checked')).toBe('true')
      expect(restricted.attributes('aria-checked')).toBe('false')

      await restricted.trigger('click')

      expect(form.access).toBe('restricted')
      expect(everyone.attributes('aria-checked')).toBe('false')
      expect(restricted.attributes('aria-checked')).toBe('true')
    })

    it('toggles form.access via the keyboard (Enter/Space), not just click', async () => {
      const form = makeForm()
      const wrapper = mountStep(form)

      await wrapper.find('[data-test="access-restricted-button"]').trigger('keydown.enter')
      expect(form.access).toBe('restricted')

      await wrapper.find('[data-test="access-everyone-button"]').trigger('keydown.space')
      expect(form.access).toBe('everyone')
    })
  })

  describe('inline cap input (no separate toggle)', () => {
    it('shows the cap input only on the currently selected mode', async () => {
      const form = makeForm({ access: 'everyone' })
      const wrapper = mountStep(form)

      expect(wrapper.find('[data-test="cc-cap"]').exists()).toBe(true)

      await wrapper.find('[data-test="access-restricted-button"]').trigger('click')

      // Still exactly one cap input — it moved to the Restricted row, not duplicated.
      expect(wrapper.findAll('[data-test="cc-cap"]')).toHaveLength(1)
    })

    it('turns the cap on by typing a value — no separate switch needed', async () => {
      const form = makeForm({ access: 'everyone', capOn: false, cap: '' })
      const wrapper = mountStep(form)

      await wrapper.find('[data-test="cc-cap"]').setValue('5000')

      expect(form.cap).toBe('5000')
      expect(form.capOn).toBe(true)
    })

    it('turns the cap back off by clearing the value', async () => {
      const form = makeForm({ access: 'everyone', capOn: true, cap: '5000' })
      const wrapper = mountStep(form)

      await wrapper.find('[data-test="cc-cap"]').setValue('')

      expect(form.cap).toBe('')
      expect(form.capOn).toBe(false)
    })
  })

  describe("member selection (mirrors Issue Note's searchable whitelist)", () => {
    beforeEach(() => vi.useFakeTimers())
    afterEach(() => vi.useRealTimers())

    it('searches, adds a lender, and lets you set a custom amount', async () => {
      const form = makeForm({ access: 'restricted' })
      const wrapper = mountStep(form)

      await wrapper.find('[data-test="whitelist-search-name"]').setValue('Bob')
      await vi.advanceTimersByTime(300)
      await wrapper.vm.$nextTick()

      expect(wrapper.find('[data-test="whitelist-search-results"]').exists()).toBe(true)
      await wrapper.find(`[data-test="user-dropdown-${BOB}"]`).trigger('click')

      expect(form.whitelist).toHaveLength(1)
      expect(form.whitelist[0]).toMatchObject({ address: BOB, username: 'Bob' })

      await wrapper.find('[data-test="whitelist-amount-input"]').setValue('5000')
      expect(form.whitelist[0].amount).toBe(5000)
    })

    it('removes a selected lender', async () => {
      const form = makeForm({
        access: 'restricted',
        whitelist: [{ username: 'Bob', address: BOB, amount: 5000 }]
      })
      const wrapper = mountStep(form)

      expect(wrapper.findAll('[data-test="whitelist-entry"]')).toHaveLength(1)
      await wrapper.find('[data-test="whitelist-remove-button"]').trigger('click')

      expect(form.whitelist).toHaveLength(0)
    })
  })

  describe('cap backfill for unset lender amounts', () => {
    beforeEach(() => vi.useFakeTimers())
    afterEach(() => vi.useRealTimers())

    it('fills in the cap for lenders added before the cap was turned on', async () => {
      const form = makeForm({
        access: 'restricted',
        whitelist: [{ username: 'Bob', address: BOB, amount: null }]
      })
      mountStep(form)

      form.capOn = true
      form.cap = '4000'
      await nextTick()
      await vi.advanceTimersByTime(300)

      expect(form.whitelist[0].amount).toBe(4000)
    })

    it('does not backfill on every keystroke — only once the cap value has settled', async () => {
      const form = makeForm({
        access: 'restricted',
        whitelist: [{ username: 'Bob', address: BOB, amount: null }]
      })
      mountStep(form)
      form.capOn = true

      // Typing "100" digit by digit must not lock the entry in at "1" the moment the
      // first keystroke lands — only the settled value should ever be backfilled.
      form.cap = '1'
      await nextTick()
      await vi.advanceTimersByTime(50)
      form.cap = '10'
      await nextTick()
      await vi.advanceTimersByTime(50)
      form.cap = '100'
      await nextTick()
      await vi.advanceTimersByTime(300)

      expect(form.whitelist[0].amount).toBe(100)
    })

    it('does not overwrite an amount the owner already set', async () => {
      const form = makeForm({
        access: 'restricted',
        whitelist: [{ username: 'Bob', address: BOB, amount: 2500 }]
      })
      mountStep(form)

      form.capOn = true
      form.cap = '4000'
      await nextTick()
      await vi.advanceTimersByTime(300)

      expect(form.whitelist[0].amount).toBe(2500)
    })

    it('backfills again when the cap value changes while still unset', async () => {
      const form = makeForm({
        access: 'restricted',
        capOn: true,
        cap: '4000',
        whitelist: [{ username: 'Bob', address: BOB, amount: null }]
      })
      mountStep(form)

      form.cap = '6000'
      await nextTick()
      await vi.advanceTimersByTime(300)

      expect(form.whitelist[0].amount).toBe(6000)
    })

    it('hides "Use default" while the cap is unset — there is nothing to default to yet', async () => {
      const form = makeForm({
        access: 'restricted',
        capOn: true,
        cap: '',
        whitelist: [{ username: 'Bob', address: BOB, amount: null }]
      })
      const wrapper = mountStep(form)
      await nextTick()

      expect(wrapper.find('[data-test="whitelist-use-default-button"]').exists()).toBe(false)
    })

    it('shows "Use default" again once a valid cap exists and an amount is cleared back to unset', async () => {
      const form = makeForm({
        access: 'restricted',
        capOn: true,
        cap: '4000',
        whitelist: [{ username: 'Bob', address: BOB, amount: 2500 }]
      })
      const wrapper = mountStep(form)

      // Simulate the owner clearing a previously-typed amount back to blank.
      await wrapper.find('[data-test="whitelist-amount-input"]').setValue('')
      expect(form.whitelist[0].amount).toBeNull()

      expect(wrapper.find('[data-test="whitelist-use-default-button"]').exists()).toBe(true)
    })

    it('shows "Use default" even when the lender already has a custom amount set', async () => {
      const form = makeForm({
        access: 'restricted',
        capOn: true,
        cap: '4000',
        whitelist: [{ username: 'Bob', address: BOB, amount: 2500 }]
      })
      const wrapper = mountStep(form)

      // Bob already has a custom amount (2500) — the button should still let the
      // owner reset it to the cap, not just offer to fill in an empty row.
      expect(wrapper.find('[data-test="whitelist-use-default-button"]').exists()).toBe(true)

      await wrapper.find('[data-test="whitelist-use-default-button"]').trigger('click')
      expect(form.whitelist[0].amount).toBe(4000)
    })
  })
})
