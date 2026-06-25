import { describe, it, expect } from 'vitest'
import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'
import CustomDatePicker from '../CustomDatePicker.vue'

// Stub the shared picker: capture its props and let tests drive its `update:modelValue`.
const AccountingDatePickerStub = defineComponent({
  name: 'AccountingDatePicker',
  props: ['modelValue', 'mode', 'storageKey'],
  emits: ['update:modelValue'],
  setup() {
    return () => h('div', { 'data-test': 'accounting-date-picker' })
  }
})

const PREFIX = 'expense-transaction-history'

const mountComponent = (modelValue: [Date, Date] | null = null) =>
  mount(CustomDatePicker, {
    props: { modelValue, dataTestPrefix: PREFIX },
    global: { stubs: { AccountingDatePicker: AccountingDatePickerStub } }
  })

const picker = (wrapper: ReturnType<typeof mountComponent>) =>
  wrapper.findComponent(AccountingDatePickerStub)

describe('CustomDatePicker', () => {
  it('renders the shared picker inside the prefixed test wrapper', () => {
    const wrapper = mountComponent()
    expect(wrapper.find(`[data-test="${PREFIX}-date-select"]`).exists()).toBe(true)
    expect(picker(wrapper).exists()).toBe(true)
  })

  it('drives the shared picker in range mode with a prefixed storage key', () => {
    const wrapper = mountComponent()
    expect(picker(wrapper).props('mode')).toBe('range')
    expect(picker(wrapper).props('storageKey')).toBe(`transaction-history-range-${PREFIX}`)
  })

  it('seeds the picker from an incoming tuple', () => {
    const start = new Date('2024-04-01')
    const end = new Date('2024-04-30')
    const wrapper = mountComponent([start, end])
    expect(picker(wrapper).props('modelValue')).toEqual({ start, end })
  })

  it('starts with no model when no tuple is provided', () => {
    const wrapper = mountComponent()
    expect(picker(wrapper).props('modelValue')).toBeUndefined()
  })

  it('re-emits a resolved range as a [start, end] tuple', async () => {
    const wrapper = mountComponent()
    const start = new Date('2024-03-01')
    const end = new Date('2024-03-31')

    await picker(wrapper).vm.$emit('update:modelValue', { start, end })

    const emitted = wrapper.emitted('update:modelValue')!
    expect(emitted[emitted.length - 1]).toEqual([[start, end]])
  })

  it('ignores a single Date value (date mode is not used here)', async () => {
    const wrapper = mountComponent()
    await picker(wrapper).vm.$emit('update:modelValue', new Date('2024-03-01'))
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })
})
