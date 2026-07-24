import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick, reactive } from 'vue'
import type { CreditCallForm } from '@/types'
import { MINUTES_PER_DAY } from '@/utils'
import CreditCallAccessStep from '../CreditCallAccessStep.vue'

function makeForm(overrides: Partial<CreditCallForm> = {}): CreditCallForm {
  return reactive({
    name: '',
    desc: '',
    target: '25000',
    token: 'USDC',
    rate: '6',
    period: 90 * MINUTES_PER_DAY,
    periodMode: 'preset',
    periodVal: '90',
    periodUnit: 'days',
    deadline: '2026-07-31',
    deadlineTime: '23:59',
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

function whitelistEntry(form: CreditCallForm, index = 0): CreditCallForm['whitelist'][number] {
  const entry = form.whitelist[index]
  expect(entry).toBeDefined()
  return entry as CreditCallForm['whitelist'][number]
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

  describe('cap section (separate toggle, below the whitelist)', () => {
    it('hides the cap input until the toggle is switched on', async () => {
      const form = makeForm({ access: 'everyone', capOn: false })
      const wrapper = mountStep(form)

      expect(wrapper.find('[data-test="cc-cap"]').exists()).toBe(false)

      await wrapper.find('[data-test="cc-cap-toggle"]').trigger('click')

      expect(form.capOn).toBe(true)
      expect(wrapper.find('[data-test="cc-cap"]').exists()).toBe(true)
    })

    it('shows the cap section regardless of the selected access mode', async () => {
      const form = makeForm({ access: 'everyone', capOn: true, cap: '5000' })
      const wrapper = mountStep(form)

      expect(wrapper.find('[data-test="cc-cap"]').exists()).toBe(true)

      await wrapper.find('[data-test="access-restricted-button"]').trigger('click')

      // Still exactly one cap section — not tied to (and not duplicated by) access mode.
      expect(wrapper.findAll('[data-test="cc-cap"]')).toHaveLength(1)
    })

    it('sets the cap amount by typing, independently of the toggle', async () => {
      const form = makeForm({ access: 'everyone', capOn: true, cap: '' })
      const wrapper = mountStep(form)

      await wrapper.find('[data-test="cc-cap"]').setValue('5000')

      expect(form.cap).toBe('5000')
      expect(form.capOn).toBe(true)
    })

    it('turns the cap off via the toggle without clearing a previously entered amount', async () => {
      const form = makeForm({ access: 'everyone', capOn: true, cap: '5000' })
      const wrapper = mountStep(form)

      await wrapper.find('[data-test="cc-cap-toggle"]').trigger('click')

      expect(form.capOn).toBe(false)
      expect(form.cap).toBe('5000')
      expect(wrapper.find('[data-test="cc-cap"]').exists()).toBe(false)
    })
  })

  describe('stale error clearing on toggle', () => {
    it('does not resurface an old whitelist error after leaving and re-entering restricted mode', async () => {
      const form = makeForm({ access: 'restricted', capOn: false, whitelist: [] })
      const wrapper = mountStep(form)

      // No lenders — validate() fails and the error is shown.
      expect(wrapper.vm.validate()).toBe(false)
      await nextTick()
      expect(wrapper.find('[data-test="cc-whitelist-error"]').exists()).toBe(true)

      await wrapper.find('[data-test="access-everyone-button"]').trigger('click')
      await wrapper.find('[data-test="access-restricted-button"]').trigger('click')

      // Back in restricted mode, still no lenders — but nothing has re-validated since,
      // so the old error must not simply reappear from stale state.
      expect(wrapper.find('[data-test="cc-whitelist-error"]').exists()).toBe(false)
    })

    it('does not resurface an old cap error after switching capOn off and back on', async () => {
      const form = makeForm({ access: 'everyone', capOn: true, cap: '0' })
      const wrapper = mountStep(form)

      expect(wrapper.vm.validate()).toBe(false)
      await nextTick()
      expect(wrapper.find('[data-test="cc-cap-error"]').exists()).toBe(true)

      await wrapper.find('[data-test="cc-cap-toggle"]').trigger('click')
      await wrapper.find('[data-test="cc-cap-toggle"]').trigger('click')

      expect(wrapper.find('[data-test="cc-cap-error"]').exists()).toBe(false)
    })
  })

  describe("member selection (mirrors Issue Note's searchable whitelist)", () => {
    beforeEach(() => vi.useFakeTimers())
    afterEach(() => vi.useRealTimers())

    it('searches, adds a lender, and lets you set a custom amount', async () => {
      const form = makeForm({ access: 'restricted', capOn: true })
      const wrapper = mountStep(form)

      await wrapper.find('[data-test="whitelist-search-name"]').setValue('Bob')
      await vi.advanceTimersByTime(300)
      await wrapper.vm.$nextTick()

      expect(wrapper.find('[data-test="whitelist-search-results"]').exists()).toBe(true)
      await wrapper.find(`[data-test="user-dropdown-${BOB}"]`).trigger('click')

      expect(form.whitelist).toHaveLength(1)
      expect(whitelistEntry(form)).toMatchObject({ address: BOB, username: 'Bob' })

      // Focusing switches the lender to custom mode (matching a real click into the
      // field) before it becomes typable.
      const input = wrapper.find('[data-test="whitelist-amount-input"]')
      await input.trigger('focus')
      await input.setValue('5000')
      expect(whitelistEntry(form).amount).toBe(5000)
      expect(whitelistEntry(form).custom).toBe(true)
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

  describe('default vs custom lender amounts (live cap sync)', () => {
    beforeEach(() => vi.useFakeTimers())
    afterEach(() => vi.useRealTimers())

    it('defaults a new lender to a read-only input showing the live cap value', () => {
      const form = makeForm({
        access: 'restricted',
        capOn: true,
        cap: '4000',
        whitelist: [{ username: 'Bob', address: BOB, amount: null }]
      })
      const wrapper = mountStep(form)

      const input = wrapper.find('[data-test="whitelist-amount-input"]')
      expect(whitelistEntry(form).custom).toBeFalsy()
      expect(whitelistEntry(form).amount).toBe(4000)
      expect((input.element as HTMLInputElement).value).toBe('4000')
      expect(input.attributes('readonly')).toBeDefined()
    })

    it('syncs a lender added before the cap was turned on, once a cap value lands', async () => {
      const form = makeForm({
        access: 'restricted',
        whitelist: [{ username: 'Bob', address: BOB, amount: null }]
      })
      mountStep(form)

      form.capOn = true
      form.cap = '4000'
      await nextTick()

      expect(whitelistEntry(form).amount).toBe(4000)
    })

    it('updates live on every keystroke, converging on the final typed cap value', async () => {
      const form = makeForm({
        access: 'restricted',
        whitelist: [{ username: 'Bob', address: BOB, amount: null }]
      })
      mountStep(form)
      form.capOn = true

      form.cap = '1'
      await nextTick()
      expect(whitelistEntry(form).amount).toBe(1)
      form.cap = '10'
      await nextTick()
      expect(whitelistEntry(form).amount).toBe(10)
      form.cap = '100'
      await nextTick()
      expect(whitelistEntry(form).amount).toBe(100)
    })

    it('keeps tracking on later cap changes too, as long as the lender stays default', async () => {
      const form = makeForm({
        access: 'restricted',
        capOn: true,
        cap: '4000',
        whitelist: [{ username: 'Bob', address: BOB, amount: null }]
      })
      mountStep(form)

      form.cap = '6000'
      await nextTick()

      expect(whitelistEntry(form).amount).toBe(6000)
    })

    it('clears every lender back to unset (and non-custom) once the round-level cap is switched off', async () => {
      const form = makeForm({
        access: 'restricted',
        capOn: true,
        cap: '4000',
        whitelist: [
          { username: 'Bob', address: BOB, amount: 4000 },
          {
            username: 'Alice',
            address: '0x2222222222222222222222222222222222222222',
            amount: 5000,
            custom: true
          }
        ]
      })
      mountStep(form)

      form.capOn = false
      await nextTick()

      expect(whitelistEntry(form).amount).toBeNull()
      expect(whitelistEntry(form).custom).toBeFalsy()
      expect(whitelistEntry(form, 1).amount).toBeNull()
      expect(whitelistEntry(form, 1).custom).toBeFalsy()
    })

    it('switches to custom mode and becomes editable once the input is focused', async () => {
      const form = makeForm({
        access: 'restricted',
        capOn: true,
        cap: '4000',
        whitelist: [{ username: 'Bob', address: BOB, amount: null }]
      })
      const wrapper = mountStep(form)

      const input = wrapper.find('[data-test="whitelist-amount-input"]')
      await input.trigger('focus')

      expect(whitelistEntry(form).custom).toBe(true)
      // Focusing doesn't change the amount — it was already tracking the cap (4000).
      expect(whitelistEntry(form).amount).toBe(4000)
    })

    it('stops tracking the cap once a lender is custom, keeping whatever amount it was given', async () => {
      const form = makeForm({
        access: 'restricted',
        capOn: true,
        cap: '4000',
        whitelist: [{ username: 'Bob', address: BOB, amount: 2500, custom: true }]
      })
      mountStep(form)

      form.cap = '6000'
      await nextTick()

      expect(whitelistEntry(form).amount).toBe(2500)
    })

    it('clearing a custom lender leaves the amount unset without exiting custom mode', async () => {
      const form = makeForm({
        access: 'restricted',
        capOn: true,
        cap: '4000',
        whitelist: [{ username: 'Bob', address: BOB, amount: 2500, custom: true }]
      })
      const wrapper = mountStep(form)

      await wrapper.find('[data-test="whitelist-amount-input"]').setValue('')

      expect(whitelistEntry(form).amount).toBeNull()
      expect(whitelistEntry(form).custom).toBe(true)
    })

    it('hides "Reset to default" for a lender still in default mode', () => {
      const form = makeForm({
        access: 'restricted',
        capOn: true,
        cap: '4000',
        whitelist: [{ username: 'Bob', address: BOB, amount: null }]
      })
      const wrapper = mountStep(form)

      expect(wrapper.find('[data-test="whitelist-reset-default-button"]').exists()).toBe(false)
    })

    it('shows "Reset to default" for a custom lender, and clicking it re-syncs to the live cap', async () => {
      const form = makeForm({
        access: 'restricted',
        capOn: true,
        cap: '4000',
        whitelist: [{ username: 'Bob', address: BOB, amount: 2500, custom: true }]
      })
      const wrapper = mountStep(form)

      const resetButton = wrapper.find('[data-test="whitelist-reset-default-button"]')
      expect(resetButton.exists()).toBe(true)

      await resetButton.trigger('click')

      expect(whitelistEntry(form).custom).toBe(false)
      expect(whitelistEntry(form).amount).toBe(4000)

      // Re-synced lenders keep tracking future cap changes again.
      form.cap = '6000'
      await nextTick()
      expect(whitelistEntry(form).amount).toBe(6000)
    })
  })

  describe('per-lender amount hidden without a round-level cap', () => {
    it('shows every lender as Uncapped, with no amount input, when the cap is off', () => {
      const form = makeForm({
        access: 'restricted',
        capOn: false,
        whitelist: [{ username: 'Bob', address: BOB, amount: 5000 }]
      })
      const wrapper = mountStep(form)

      expect(wrapper.find('[data-test="whitelist-uncapped-label"]').text()).toBe('Uncapped')
      expect(wrapper.find('[data-test="whitelist-amount-input"]').exists()).toBe(false)
    })
  })
})
