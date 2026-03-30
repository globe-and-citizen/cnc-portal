<!-- CustomDatePicker.vue -->
<template>
  <USelectMenu
    v-model="selectedOption"
    :items="options"
    value-key="value"
    :search-input="false"
    v-model:open="isDropdownOpen"
    :data-test="`${dataTestPrefix}-date-select`"
  >
    <template #default>
      <span>{{ displayDateRange }}</span>
    </template>
    <template #content-bottom>
      <div class="border-t border-gray-200 p-1">
        <Datepicker
          v-model="dateRange"
          range
          :format="'dd/MM/yyyy'"
          placeholder="Select Date Range"
          auto-apply
          :data-test="`${dataTestPrefix}-date-range-picker`"
          @update:model-value="isDropdownOpen = false"
        >
          <template #trigger>
            <div
              class="flex w-full cursor-pointer select-none items-center rounded-md px-2 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              Custom Range
            </div>
          </template>
        </Datepicker>
      </div>
    </template>
  </USelectMenu>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import Datepicker from '@vuepic/vue-datepicker'
import '@vuepic/vue-datepicker/dist/main.css'

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

const getCurrentMonthName = () => new Date().toLocaleString('default', { month: 'long' })

const getPreviousMonthName = () => {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth() - 1).toLocaleString('default', { month: 'long' })
}

const options = computed(() => [
  { value: 'current', label: getCurrentMonthName() },
  { value: 'previous', label: getPreviousMonthName() }
])

const getCurrentMonthRange = (): [Date, Date] => {
  const now = new Date()
  return [new Date(now.getFullYear(), now.getMonth(), 1), new Date(now.getFullYear(), now.getMonth() + 1, 0)]
}

const getPreviousMonthRange = (): [Date, Date] => {
  const now = new Date()
  return [new Date(now.getFullYear(), now.getMonth() - 1, 1), new Date(now.getFullYear(), now.getMonth(), 0)]
}

watch(selectedOption, (newValue) => {
  if (newValue === 'current') dateRange.value = getCurrentMonthRange()
  else if (newValue === 'previous') dateRange.value = getPreviousMonthRange()
})

watch(dateRange, (newValue) => {
  if (newValue) emit('update:modelValue', newValue)
})

watch(
  () => props.modelValue,
  (newValue) => {
    if (newValue) dateRange.value = newValue
  }
)

onMounted(() => {
  dateRange.value = props.modelValue ?? getCurrentMonthRange()
})

const formatDisplayDate = (date: Date) =>
  `${date.toLocaleString('default', { month: 'long' })} ${date.getDate()}`

const displayDateRange = computed(() => {
  if (!dateRange.value) return ''
  const [start, end] = dateRange.value
  return `${formatDisplayDate(start)} - ${formatDisplayDate(end)}`
})
</script>
