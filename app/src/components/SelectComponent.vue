<template>
  <div
    role="button"
    class="flex items-center cursor-pointer badge badge-md badge-info text-xs mr-6"
    @click="toggleDropdown"
    data-test="generic-selector"
  >
    <span>{{ formattedSelectedValue }}</span>
    <IconifyIcon v-if="!disabled" icon="heroicons-outline:chevron-down" class="w-4 h-4" />
  </div>
  <ul
    class="absolute right-0 mt-2 menu bg-base-200 border-2 rounded-box z-[1] p-2 shadow"
    ref="target"
    data-test="options-dropdown"
    v-if="isDropdown"
  >
    <li v-for="option in options" :key="option.value" @click="selectOption(option)">
      <a>{{ option.label || option.value }}</a>
    </li>
  </ul>
</template>

<script lang="ts" setup>
import { ref, computed, watch } from 'vue'
import { Icon as IconifyIcon } from '@iconify/vue'

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
  }
})

const emits = defineEmits(['update:modelValue', 'change'])

const isDropdown = ref(false)
const selectedValue = ref(
  props.modelValue || (props.options.length > 0 ? props.options[0].value : '')
)

const toggleDropdown = () => {
  if (!props.disabled) {
    isDropdown.value = !isDropdown.value
  }
}

const selectOption = (option: Option) => {
  selectedValue.value = option.value
  emits('update:modelValue', option.value)
  emits('change', option.value)
  isDropdown.value = false
}

const formattedSelectedValue = computed(() => {
  const selectedOption = props.options.find((opt) => opt.value === selectedValue.value)
  const displayValue = selectedOption?.label || selectedOption?.value || ''
  return props.formatValue(displayValue)
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
</script>
