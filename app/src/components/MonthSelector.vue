<template>
  <div
    class="mb-4 flex w-full max-w-full flex-col gap-2 sm:flex-wrap md:flex-row md:items-center md:justify-between"
  >
    <UButton
      @click="goToPrevMonth"
      class="flex w-full items-center justify-center whitespace-nowrap sm:w-auto"
      size="sm"
      icon="heroicons:chevron-left"
    />

    <div class="relative w-full text-center sm:w-auto">
      <VueDatePicker
        v-model="monthPicked"
        :month-picker="true"
        :year-picker="true"
        auto-apply
        class="w-full rounded-sm bg-white sm:w-auto"
      >
        <template #trigger>
          <UButton
            @click="toggleMonthPicker"
            class="flex w-full items-center justify-center whitespace-nowrap sm:w-auto"
            size="sm"
          >
            <span v-if="model">{{ formatMonthYear(model.year, model.month) }}</span>
            <IconifyIcon icon="heroicons:chevron-down" class="ml-1 h-4 w-4" />
          </UButton>
        </template>
      </VueDatePicker>
    </div>

    <UButton
      @click="goToNextMonth"
      class="flex w-full items-center justify-center whitespace-nowrap sm:w-auto"
      size="sm"
      icon="heroicons:chevron-right"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import VueDatePicker from '@vuepic/vue-datepicker'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import isoWeek from 'dayjs/plugin/isoWeek'
import { Icon as IconifyIcon } from '@iconify/vue'
import type { Week } from '@/utils/dayUtils'
import { formatIsoWeekRange, formatMonthYear } from '@/utils/dayUtils'

dayjs.extend(utc)
dayjs.extend(isoWeek)

const model = defineModel<Week>()

// monthPicked is { month, year, isoWeek }
const monthPicked = ref<Week | null>(null)
const isMonthPickerOpen = ref(false)

// When monthPicked changes, update model
watch(monthPicked, (newVal) => {
  if (newVal) {
    const day = dayjs.utc().year(newVal.year).month(newVal.month).startOf('month')
    model.value = {
      month: newVal.month,
      year: newVal.year,
      isoWeek: day.isoWeek(),
      formatted: formatIsoWeekRange(day),
      isoString: day.toISOString()
    }
  }
})

// Formatting helpers imported from utils

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

  const format = formatIsoWeekRange(monthFirstDate)

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

  const format = formatIsoWeekRange(monthFirstDate)

  model.value = { month, year, isoWeek, formatted: format, isoString: monthFirstDate.toISOString() }
}

function toggleMonthPicker() {
  isMonthPickerOpen.value = !isMonthPickerOpen.value
}
</script>
