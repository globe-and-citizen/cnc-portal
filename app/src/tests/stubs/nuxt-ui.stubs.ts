import { defineComponent, h } from 'vue'

export const UButtonStub = defineComponent({
  name: 'UButton',
  props: [
    'loading',
    'disabled',
    'color',
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
          disabled: props.disabled || props.loading,
          onClick: (event) => emit('click', event)
        },
        [
          props.icon ? h('span', { 'data-test': 'u-icon', 'data-icon': props.icon }) : undefined,
          slots.default ? slots.default() : props.label,
          props.trailingIcon
            ? h('span', { 'data-test': 'u-icon', 'data-icon': props.trailingIcon })
            : undefined
        ]
      )
  }
})

export const UIconStub = defineComponent({
  name: 'UIcon',
  props: ['name', 'size', 'class'],
  setup(props) {
    return () => h('span', { 'data-test': 'u-icon', 'data-icon': props.name, class: props.class })
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
  props: {
    modelValue: { type: String },
    open: { type: Boolean },
    items: { type: Array as () => Array<{ value: string; label: string }> },
    valueKey: { type: String },
    searchInput: { type: Boolean },
    loading: { type: Boolean },
    placeholder: { type: String },
    by: { type: String },
    avatar: { type: Object }
  },
  emits: ['update:modelValue', 'update:open'],
  setup(props, { slots, attrs, emit }) {
    return () =>
      h(
        'div',
        {
          ...attrs,
          'data-test': 'u-select-menu',
          'data-loading': props.loading ? 'true' : undefined
        },
        [
          h(
            'button',
            { 'data-test': 'select-trigger', onClick: () => emit('update:open', !props.open) },
            slots.default?.() ?? props.placeholder
          ),
          props.open
            ? h(
                'ul',
                {},
                props.items?.map((item) =>
                  h(
                    'li',
                    {
                      key: item.value,
                      onClick: () => {
                        emit('update:modelValue', item.value)
                        emit('update:open', false)
                      }
                    },
                    item.label
                  )
                )
              )
            : undefined,
          props.open ? slots['content-bottom']?.() : undefined
        ]
      )
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
