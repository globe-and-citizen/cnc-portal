import { defineComponent, h } from 'vue'

export const UButtonStub = defineComponent({
  name: 'UButton',
  props: [
    'loading',
    'disabled',
    'color',
    'class',
    'label',
    'icon',
    'iconTrailing',
    'size',
    'variant',
    'trailingIcon'
  ],
  emits: ['click'],
  setup(props, { slots, emit, attrs }) {
    return () =>
      h(
        'button',
        {
          ...attrs,
          disabled: props.disabled,
          onClick: (event) => emit('click', event)
        },
        slots.default ? slots.default() : props.label
      )
  }
})

export const UIconStub = defineComponent({
  name: 'UIcon',
  props: ['name', 'size', 'class'],
  setup(props) {
    return () => h('span', { 'data-test': 'u-icon', class: props.class }, props.name)
  }
})

export const UDropdownStub = defineComponent({
  name: 'UDropdown',
  props: ['items', 'popper', 'modelValue'],
  emits: ['update:modelValue', 'select'],
  setup(props, { slots }) {
    return () => h('div', { 'data-test': 'u-dropdown' }, slots.default?.())
  }
})

export const UModalStub = defineComponent({
  name: 'UModal',
  props: ['open', 'close', 'title'],
  emits: ['update:open'],
  setup(props, { slots }) {
    return () =>
      props.open
        ? h('div', { 'data-test': 'u-modal', role: 'dialog' }, [
            props.title ? h('h2', props.title) : undefined,
            slots.body?.() ?? slots.default?.()
          ])
        : undefined
  }
})

export const USelectMenuStub = defineComponent({
  name: 'USelectMenu',
  props: ['modelValue', 'open', 'items', 'valueKey', 'searchInput'],
  emits: ['update:modelValue', 'update:open'],
  setup(props, { slots, attrs }) {
    return () =>
      h('div', { ...attrs }, [
        slots.default?.(),
        props.open ? slots['content-bottom']?.() : undefined
      ])
  }
})

export const UCalendarStub = defineComponent({
  name: 'UCalendar',
  props: ['modelValue', 'range', 'numberOfMonths'],
  emits: ['update:modelValue'],
  setup() {
    return () => h('div', { 'data-test': 'u-calendar' })
  }
})
