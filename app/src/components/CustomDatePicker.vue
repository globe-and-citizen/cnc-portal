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
        <div
          class="flex w-full cursor-pointer items-center rounded-md px-2 py-1.5 text-sm select-none hover:bg-gray-100 dark:hover:bg-gray-800"
          @click="openCustomRangeModal"
        >
          Custom Range
        </div>
      </div>
    </template>
  </USelectMenu>

  <UModal v-model:open="isModalOpen" title="Custom Date Range">
    <template #body>
      <div class="flex justify-center py-2">
        <UCalendar range v-model="calendarRange" :number-of-months="2" />
      </div>
    </template>
    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton color="neutral" variant="ghost" @click="isModalOpen = false">Cancel</UButton>
        <UButton :disabled="!calendarRange?.start || !calendarRange?.end" @click="applyCustomRange">
          Apply
        </UButton>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { CalendarDate } from '@internationalized/date'
import type { DateRange } from 'reka-ui'

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
const isModalOpen = ref(false)
const calendarRange = ref<DateRange | undefined>()

const getCurrentMonthName = () => new Date().toLocaleString('default', { month: 'long' })

const getPreviousMonthName = () => {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth() - 1).toLocaleString('default', {
    month: 'long'
  })
}

const options = computed(() => [
  { value: 'current', label: getCurrentMonthName() },
  { value: 'previous', label: getPreviousMonthName() }
])

const getCurrentMonthRange = (): [Date, Date] => {
  const now = new Date()
  return [
    new Date(now.getFullYear(), now.getMonth(), 1),
    new Date(now.getFullYear(), now.getMonth() + 1, 0)
  ]
}

const getPreviousMonthRange = (): [Date, Date] => {
  const now = new Date()
  return [
    new Date(now.getFullYear(), now.getMonth() - 1, 1),
    new Date(now.getFullYear(), now.getMonth(), 0)
  ]
}

const dateToCalendarDate = (date: Date): CalendarDate =>
  new CalendarDate(date.getFullYear(), date.getMonth() + 1, date.getDate())

const calendarDateToDate = (cd: CalendarDate): Date => new Date(cd.year, cd.month - 1, cd.day)

const openCustomRangeModal = () => {
  isDropdownOpen.value = false
  if (dateRange.value) {
    calendarRange.value = {
      start: dateToCalendarDate(dateRange.value[0]),
      end: dateToCalendarDate(dateRange.value[1])
    }
  }
  isModalOpen.value = true
}

const applyCustomRange = () => {
  if (calendarRange.value?.start && calendarRange.value?.end) {
    dateRange.value = [
      calendarDateToDate(calendarRange.value.start as CalendarDate),
      calendarDateToDate(calendarRange.value.end as CalendarDate)
    ]
  }
  isModalOpen.value = false
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
