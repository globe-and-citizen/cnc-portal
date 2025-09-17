<template>
  <div
    class="flex flex-col sm:flex-wrap md:flex-row md:items-center md:justify-between gap-2 mb-4 w-full max-w-full"
  >
    <ButtonUI
      @click="goToPrevMonth"
      class="w-full sm:w-auto flex items-center justify-center whitespace-nowrap"
    >
      <IconifyIcon icon="heroicons:chevron-left" class="w-4 h-4" />
      <span class="ml-1">Prev</span>
    </ButtonUI>

    <div class="relative w-full sm:w-auto text-center">
      <VueDatePicker
        v-model="monthPicked"
        :month-picker="true"
        :year-picker="true"
        auto-apply
        class="bg-white rounded w-full sm:w-auto"
      >
        <template #trigger>
          <ButtonUI
            @click="toggleMonthPicker"
            class="w-full sm:w-auto flex items-center justify-center whitespace-nowrap"
          >
            <span v-if="model">{{ formatMonthYear(model.year, model.month) }}</span>
            <IconifyIcon icon="heroicons:chevron-down" class="w-4 h-4 ml-1" />
          </ButtonUI>
        </template>
      </VueDatePicker>
    </div>

    <ButtonUI
      @click="goToNextMonth"
      class="w-full sm:w-auto flex items-center justify-center whitespace-nowrap"
    >
      <span class="mr-1">Next</span>
      <IconifyIcon icon="heroicons:chevron-right" class="w-4 h-4" />
    </ButtonUI>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import ButtonUI from '@/components/ButtonUI.vue'
import VueDatePicker from '@vuepic/vue-datepicker'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import isoWeek from 'dayjs/plugin/isoWeek'
import { Icon as IconifyIcon } from '@iconify/vue'
import type { Week } from '@/utils/dayUtils'

dayjs.extend(utc)
dayjs.extend(isoWeek)

const model = defineModel<Week>()

// monthPicked is { month, year, isoWeek }
const monthPicked = ref<Week | null>(null)
const isMonthPickerOpen = ref(false)

// When monthPicked changes, update model
watch(monthPicked, (newVal) => {
  if (newVal && typeof newVal.month === 'number' && typeof newVal.year === 'number') {
    const day=   dayjs.utc().year(newVal.year).month(newVal.month).startOf('month')
    model.value = {
      month: newVal.month,
      year: newVal.year,
      isoWeek: day.isoWeek(),
      formatted: formatIsoWeekRange(day),
      isoString: day.toISOString()
    }
  }
})

// New: date formatting helper
function formatMonthYear(year: number, month: number): string {
  try {
    // Use UTC for consistency with the rest of the component
    return dayjs.utc().year(year).month(month).format('MMMM YYYY')
  } catch (error) {
    console.error('Error formatting month/year:', error)
    // Fallback to a safe ISO-like label
    return `${year}-${String(month + 1).padStart(2, '0')}`
  }
}

// New: ISO week range formatter (e.g., "Jan 01 - Jan 07")
function formatIsoWeekRange(base: dayjs.Dayjs): string {
  try {
    const start = base.startOf('isoWeek')
    const end = base.endOf('isoWeek')
    return `${start.format('MMM DD')} - ${end.format('MMM DD')}`
  } catch (error) {
    console.error('Error formatting ISO week range:', error)
    return `${base.format('YYYY-MM-DD')} - ${base.add(6, 'day').format('YYYY-MM-DD')}`
  }
}

function goToPrevMonth() {
  if (!model.value) return
  let { month, year } = model.value
  if (month === 0) {
    month = 11
    year -= 1
  } else {
    month -= 1
  }
  const monthFirstDate = dayjs.utc(new Date(year, month, 1)).startOf('month')
  const isoWeek = dayjs.utc(new Date(year, month, 1)).isoWeek()

  const format =
    formatIsoWeekRange(monthFirstDate)

  model.value = { month, year, isoWeek, formatted: format, isoString: monthFirstDate.toISOString() }
}

function goToNextMonth() {
  if (!model.value) return
  let { month, year } = model.value
  if (month === 11) {
    month = 0
    year += 1
  } else {
    month += 1
  }
  const monthFirstDate = dayjs.utc(new Date(year, month, 1)).startOf('month')
  const isoWeek = dayjs.utc(new Date(year, month, 1)).isoWeek()

  const format =
    formatIsoWeekRange(monthFirstDate)

  model.value = { month, year, isoWeek, formatted: format, isoString: monthFirstDate.toISOString() }
}

function toggleMonthPicker() {
  isMonthPickerOpen.value = !isMonthPickerOpen.value
}
</script>
