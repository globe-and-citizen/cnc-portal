<template>
  <div class="relative">
    <div
      role="button"
      class="flex items-center cursor-pointer badge badge-md badge-info text-xs"
      @click="toggleDropdown"
      @keydown.enter="toggleDropdown"
      @keydown.space.prevent="toggleDropdown"
      @keydown.escape="isDropdown = false"
      @keydown="handleKeydown"
      tabindex="0"
      data-test="generic-selector"
      :aria-label="ariaLabel"
      :aria-expanded="isDropdown"
      :aria-haspopup="true"
    >
      <span>{{ formattedSelectedValue }}</span>
      <IconifyIcon v-if="!disabled" icon="heroicons-outline:chevron-down" class="w-4 h-4" />
    </div>
    <ul
      class="absolute right-0 mt-2 menu bg-base-200 border-2 rounded-box z-[1] p-2 shadow"
      ref="target"
      data-test="options-dropdown"
      v-if="isDropdown"
      role="listbox"
    >
      <li
        v-for="(option, index) in options"
        :key="option.value"
        @click="selectOption(option)"
        role="option"
        :aria-selected="option.value === selectedValue"
      >
        <a
          :class="{
            focus: index === focusedIndex,
            active: option.value === selectedValue && options.length > 2
          }"
          >{{ option.label || option.value }}</a
        >
      </li>
    </ul>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, watch, onMounted } from 'vue'
import { Icon as IconifyIcon } from '@iconify/vue'
import { onClickOutside } from '@vueuse/core'

interface Option {
  value: string
  label?: string
}

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  options: {
    type: Array as () => Option[],
    required: true
  },
  disabled: {
    type: Boolean,
    default: false
  },
  formatValue: {
    type: Function,
    default: (value: string) => value
  },
  ariaLabel: {
    type: String,
    default: ''
  }
})

const emits = defineEmits(['update:modelValue'])

const isDropdown = ref(false)
const target = ref<HTMLElement>()
const focusedIndex = ref(-1)
const selectedValue = ref(
  props.modelValue || (props.options.length > 0 ? props.options[0].value : '')
)

// Close dropdown when clicking outside
onClickOutside(target, () => {
  if (isDropdown.value) {
    isDropdown.value = false
    focusedIndex.value = -1
  }
})

// Keyboard navigation
const handleKeydown = (event: KeyboardEvent) => {
  if (!isDropdown.value) return

  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      focusedIndex.value = Math.min(focusedIndex.value + 1, props.options.length - 1)
      break
    case 'ArrowUp':
      event.preventDefault()
      focusedIndex.value = Math.max(focusedIndex.value - 1, 0)
      break
    case 'Enter':
      event.preventDefault()
      if (focusedIndex.value >= 0) {
        selectOption(props.options[focusedIndex.value])
      }
      break
    case 'Escape':
      isDropdown.value = false
      focusedIndex.value = -1
      break
  }
}

const toggleDropdown = () => {
  if (!props.disabled) {
    isDropdown.value = !isDropdown.value
    if (isDropdown.value) {
      focusedIndex.value = props.options.findIndex((opt) => opt.value === selectedValue.value)
    } else {
      focusedIndex.value = -1
    }
  }
}

const selectOption = (option: Option) => {
  if (!option || props.disabled) return

  selectedValue.value = option.value
  emits('update:modelValue', option.value)
  isDropdown.value = false
  focusedIndex.value = -1
}

const formattedSelectedValue = computed(() => {
  if (!props.options.length) return ''

  const selectedOption = props.options.find((opt) => opt.value === selectedValue.value)
  const displayValue =
    selectedOption?.label ||
    selectedOption?.value ||
    props.options[0].label ||
    props.options[0].value

  try {
    return props.formatValue(displayValue)
  } catch (error) {
    console.warn('Error formatting select value:', error)
    return displayValue
  }
})

// Watch for external modelValue changes
watch(
  () => props.modelValue,
  (newValue) => {
    if (newValue !== undefined && newValue !== selectedValue.value) {
      selectedValue.value = newValue
    }
  }
)

// Emit initial value if no modelValue is provided
onMounted(() => {
  if (!props.modelValue && props.options.length > 0) {
    const initialValue = props.options[0].value
    selectedValue.value = initialValue
    emits('update:modelValue', initialValue)
  }
})
</script>
