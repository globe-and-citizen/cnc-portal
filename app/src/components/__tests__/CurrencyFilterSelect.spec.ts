import { describe, it, expect } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import CurrencyFilterSelect from '@/components/CurrencyFilterSelect.vue'

const currencies = ['POL', 'USDC', 'SHER']

function mountSelect(modelValue: string[]) {
  return mount(CurrencyFilterSelect, { props: { modelValue, currencies } })
}

/** The trigger shows the summary; the menu entries are the `type="button"` ones. */
const trigger = (w: VueWrapper) =>
  w.findAll('button').find((b) => b.attributes('type') !== 'button')!
const options = (w: VueWrapper) =>
  w.findAll('button').filter((b) => b.attributes('type') === 'button')

describe('CurrencyFilterSelect', () => {
  it('summarizes the current selection on the trigger', () => {
    expect(trigger(mountSelect(['POL', 'USDC', 'SHER'])).text()).toContain('All currencies')
    expect(trigger(mountSelect([])).text()).toContain('No currencies')
    expect(trigger(mountSelect(['USDC'])).text()).toContain('USDC')
    expect(trigger(mountSelect(['POL', 'USDC'])).text()).toContain('2 currencies')
  })

  it('toggles a single currency off', async () => {
    const wrapper = mountSelect(['POL', 'USDC', 'SHER'])
    await options(wrapper)?.[2]?.trigger('click') // "USDC"
    expect(wrapper.emitted('update:modelValue')?.[0]?.[0]).toEqual(['POL', 'SHER'])
  })

  it('toggles a single currency on', async () => {
    const wrapper = mountSelect(['POL'])
    await options(wrapper)?.[2]?.trigger('click') // "USDC"
    expect(wrapper.emitted('update:modelValue')?.[0]?.[0]).toEqual(['POL', 'USDC'])
  })

  it('clears via "All currencies" when everything is selected', async () => {
    const wrapper = mountSelect(['POL', 'USDC', 'SHER'])
    await options(wrapper)?.[0]?.trigger('click') // "All currencies"
    expect(wrapper.emitted('update:modelValue')?.[0]?.[0]).toEqual([])
  })

  it('selects every currency via "All currencies" when some are hidden', async () => {
    const wrapper = mountSelect(['POL'])
    await options(wrapper)?.[0]?.trigger('click') // "All currencies"
    expect(wrapper.emitted('update:modelValue')?.[0]?.[0]).toEqual(['POL', 'USDC', 'SHER'])
  })
})
