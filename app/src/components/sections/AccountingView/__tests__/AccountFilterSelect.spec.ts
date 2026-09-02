import { describe, it, expect } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import AccountFilterSelect from '@/components/sections/AccountingView/AccountFilterSelect.vue'

const accounts = ['Cash — Bank', 'Wages Expense', 'Wages Payable']

function mountSelect(modelValue: string[]) {
  return mount(AccountFilterSelect, { props: { modelValue, accounts } })
}

/** The trigger shows the summary; the menu entries carry a `data-test` hook. */
const trigger = (w: VueWrapper) =>
  w.findAll('button').find((b) => b.attributes('type') !== 'button')!
const allOption = (w: VueWrapper) => w.find('[data-test="account-filter-all"]')
const option = (w: VueWrapper, account: string) => w.find(`[data-test="account-filter-${account}"]`)

describe('AccountFilterSelect', () => {
  it('summarizes the current selection on the trigger', () => {
    expect(trigger(mountSelect(accounts)).text()).toContain('All accounts')
    expect(trigger(mountSelect([])).text()).toContain('No accounts')
    expect(trigger(mountSelect(['Wages Payable'])).text()).toContain('Wages Payable')
    expect(trigger(mountSelect(['Cash — Bank', 'Wages Payable'])).text()).toContain('2 accounts')
  })

  it('marks the selected accounts with a check and leaves the rest unmarked', () => {
    const wrapper = mountSelect(['Wages Payable'])
    // Selected → check icon; unselected → the placeholder minus icon.
    expect(option(wrapper, 'Wages Payable').html()).toContain('i-heroicons-check')
    expect(option(wrapper, 'Cash — Bank').html()).toContain('i-heroicons-minus')
  })

  it('toggles a single account off', async () => {
    const wrapper = mountSelect(['Cash — Bank', 'Wages Expense', 'Wages Payable'])
    await option(wrapper, 'Wages Expense').trigger('click')
    expect(wrapper.emitted('update:modelValue')?.[0]?.[0]).toEqual(['Cash — Bank', 'Wages Payable'])
  })

  it('toggles a single account on', async () => {
    const wrapper = mountSelect(['Cash — Bank'])
    await option(wrapper, 'Wages Expense').trigger('click')
    expect(wrapper.emitted('update:modelValue')?.[0]?.[0]).toEqual(['Cash — Bank', 'Wages Expense'])
  })

  it('clears via "All accounts" when everything is selected', async () => {
    const wrapper = mountSelect(accounts)
    await allOption(wrapper).trigger('click')
    expect(wrapper.emitted('update:modelValue')?.[0]?.[0]).toEqual([])
  })

  it('selects every account via "All accounts" when some are hidden', async () => {
    const wrapper = mountSelect(['Cash — Bank'])
    await allOption(wrapper).trigger('click')
    expect(wrapper.emitted('update:modelValue')?.[0]?.[0]).toEqual(accounts)
  })
})
