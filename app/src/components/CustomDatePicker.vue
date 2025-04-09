<!-- CustomDatePicker.vue -->
<template>
  <div class="relative flex flex-col gap-2">
    <div class="flex items-center gap-2">
      <div>
        <ButtonUI
          class="flex items-center cursor-pointer gap-4 border border-gray-300"
          @click="() => (isDropdownOpen = !isDropdownOpen)"
          :data-test="`${dataTestPrefix}-date-select`"
        >
          <span>{{ displayDateRange }}</span>
          <IconComponent icon="heroicons:chevron-down" class="w-4 h-4" />
        </ButtonUI>
        <ul
          class="absolute right-0 mt-2 menu bg-base-200 border-2 rounded-box z-[1] w-52 p-2 shadow"
          ref="target"
          v-if="isDropdownOpen"
        >
          <li
            v-for="option in options"
            :key="option.value"
            @click="handleOptionSelect(option.value)"
          >
            <a>{{ option.label }}</a>
          </li>
          <li>
            <Datepicker
              v-model="dateRange"
              range
              :format="'dd/MM/yyyy'"
              placeholder="Select Date Range"
              auto-apply
              :data-test="`${dataTestPrefix}-date-range-picker`"
            >
              <template #trigger>
                <p>Custom Range</p>
              </template>
            </Datepicker>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import Datepicker from '@vuepic/vue-datepicker'
import '@vuepic/vue-datepicker/dist/main.css'
import { onClickOutside } from '@vueuse/core'
import ButtonUI from './ButtonUI.vue'
import IconComponent from './IconComponent.vue'

interface Props {
  modelValue: [Date, Date] | null
  dataTestPrefix?: string
}

const props = withDefaults(defineProps<Props>(), {
  dataTestPrefix: 'date-picker'
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: [Date, Date] | null): void
}>()

const selectedOption = ref('current')
const dateRange = ref<[Date, Date] | null>(null)
const isDropdownOpen = ref(false)
const target = ref<HTMLElement | null>(null)

// Get current month name
const getCurrentMonthName = () => {
  return new Date().toLocaleString('default', { month: 'long' })
}

// Get previous month name
const getPreviousMonthName = () => {
  const now = new Date()
  const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1)
  return previousMonth.toLocaleString('default', { month: 'long' })
}

const options = computed(() => [
  { value: 'current', label: getCurrentMonthName() },
  { value: 'previous', label: getPreviousMonthName() }
])

// Get first and last day of current month
const getCurrentMonthRange = () => {
  const now = new Date()
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  return [firstDay, lastDay] as [Date, Date]
}

// Get first and last day of previous month
const getPreviousMonthRange = () => {
  const now = new Date()
  const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastDay = new Date(now.getFullYear(), now.getMonth(), 0)
  return [firstDay, lastDay] as [Date, Date]
}

// Watch for changes in selectedOption
watch(selectedOption, (newValue) => {
  switch (newValue) {
    case 'current':
      dateRange.value = getCurrentMonthRange()
      break
    case 'previous':
      dateRange.value = getPreviousMonthRange()
      break
    case 'custom':
      // Keep existing date range if any, otherwise reset
      if (!dateRange.value) {
        dateRange.value = getCurrentMonthRange()
      }
      break
  }
})

// Watch for changes in dateRange
watch(dateRange, (newValue) => {
  if (newValue) {
    emit('update:modelValue', newValue)
  }
})

// Watch for changes in modelValue
watch(
  () => props.modelValue,
  (newValue) => {
    if (newValue) {
      dateRange.value = newValue
    }
  }
)

// Set default range to current month on mount
onMounted(() => {
  if (!props.modelValue) {
    dateRange.value = getCurrentMonthRange()
  } else {
    dateRange.value = props.modelValue
  }
})

// Handle clicking outside of dropdown
onClickOutside(target, () => {
  isDropdownOpen.value = false
})

const handleOptionSelect = (value: string) => {
  selectedOption.value = value
  if (value !== 'custom') {
    isDropdownOpen.value = false
  }
}

// Format date for display
const formatDisplayDate = (date: Date) => {
  const month = date.toLocaleString('default', { month: 'long' })
  const day = date.getDate()
  return `${month} ${day}`
}

// Computed property for displaying the date range
const displayDateRange = computed(() => {
  if (!dateRange.value) return ''

  const [start, end] = dateRange.value
  const startStr = formatDisplayDate(start)
  const endStr = formatDisplayDate(end)

  return `${startStr} - ${endStr}`
})
</script>
