import { describe, it, expect } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import ColumnVisibilitySelect from '@/components/ColumnVisibilitySelect.vue'

const items = [
  { value: 'a', label: 'Col A' },
  { value: 'b', label: 'Col B' },
  { value: 'c', label: 'Col C' }
]

function mountSelect(modelValue: string[]) {
  return mount(ColumnVisibilitySelect, { props: { modelValue, items } })
}

/** The trigger shows the summary; the menu entries are the `type="button"` ones. */
const trigger = (w: VueWrapper) =>
  w.findAll('button').find((b) => b.attributes('type') !== 'button')!
const options = (w: VueWrapper) =>
  w.findAll('button').filter((b) => b.attributes('type') === 'button')

describe('ColumnVisibilitySelect', () => {
  it('summarizes the current selection on the trigger', () => {
    expect(trigger(mountSelect(['a', 'b', 'c'])).text()).toContain('All columns')
    expect(trigger(mountSelect([])).text()).toContain('No columns')
    expect(trigger(mountSelect(['b'])).text()).toContain('Col B')
    expect(trigger(mountSelect(['a', 'b'])).text()).toContain('2 columns')
  })

  it('toggles a single column off', async () => {
    const wrapper = mountSelect(['a', 'b', 'c'])
    await options(wrapper)?.[2]?.trigger('click') // "Col B"
    expect(wrapper.emitted('update:modelValue')?.[0]?.[0]).toEqual(['a', 'c'])
  })

  it('toggles a single column on', async () => {
    const wrapper = mountSelect(['a'])
    await options(wrapper)?.[2]?.trigger('click') // "Col B"
    expect(wrapper.emitted('update:modelValue')?.[0]?.[0]).toEqual(['a', 'b'])
  })

  it('clears via "All columns" when everything is selected', async () => {
    const wrapper = mountSelect(['a', 'b', 'c'])
    await options(wrapper)?.[0]?.trigger('click') // "All columns"
    expect(wrapper.emitted('update:modelValue')?.[0]?.[0]).toEqual([])
  })

  it('selects every column via "All columns" when some are hidden', async () => {
    const wrapper = mountSelect(['a'])
    await options(wrapper)?.[0]?.trigger('click') // "All columns"
    expect(wrapper.emitted('update:modelValue')?.[0]?.[0]).toEqual(['a', 'b', 'c'])
  })
})
