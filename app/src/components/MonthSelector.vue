<template>
  <div
    class="mb-4 flex w-full max-w-full flex-col gap-2 sm:flex-wrap md:flex-row md:items-center md:justify-between"
  >
    <UButton
      @click="goToPrevMonth"
      class="flex w-full items-center justify-center whitespace-nowrap sm:w-auto"
      size="sm"
      icon="heroicons:chevron-left"
      data-test="prev-month"
    />

    <div class="relative w-full text-center sm:w-auto">
      <UPopover v-model:open="isMonthPickerOpen" :content="{ align: 'center' }">
        <UButton
          class="flex w-full items-center justify-center whitespace-nowrap sm:w-auto"
          size="sm"
          data-test="month-picker-trigger"
        >
          <span v-if="model">{{ formatMonthYear(model.year, model.month) }}</span>
          <IconifyIcon icon="heroicons:chevron-down" class="ml-1 h-4 w-4" />
        </UButton>
        <template #content>
          <div class="w-64 p-3" data-test="month-picker-panel">
            <div class="mb-3 flex items-center justify-between">
              <UButton
                size="xs"
                variant="ghost"
                color="neutral"
                icon="heroicons:chevron-left"
                aria-label="Previous year"
                data-test="prev-year"
                @click="viewYear -= 1"
              />
              <span class="text-sm font-medium">{{ viewYear }}</span>
              <UButton
                size="xs"
                variant="ghost"
                color="neutral"
                icon="heroicons:chevron-right"
                aria-label="Next year"
                data-test="next-year"
                @click="viewYear += 1"
              />
            </div>
            <div class="grid grid-cols-3 gap-1">
              <UButton
                v-for="(name, idx) in monthLabels"
                :key="idx"
                :variant="isSelected(idx) ? 'solid' : 'ghost'"
                :color="isSelected(idx) ? 'primary' : 'neutral'"
                size="sm"
                block
                :data-test="`month-${idx}`"
                @click="selectMonth(idx)"
              >
                {{ name }}
              </UButton>
            </div>
          </div>
        </template>
      </UPopover>
    </div>

    <UButton
      @click="goToNextMonth"
      class="flex w-full items-center justify-center whitespace-nowrap sm:w-auto"
      size="sm"
      icon="heroicons:chevron-right"
      data-test="next-month"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import isoWeek from 'dayjs/plugin/isoWeek'
import { Icon as IconifyIcon } from '@iconify/vue'
import type { Week } from '@/utils/dayUtils'
import { formatIsoWeekRange, formatMonthYear } from '@/utils/dayUtils'

dayjs.extend(utc)
dayjs.extend(isoWeek)

const model = defineModel<Week>()

const isMonthPickerOpen = ref(false)
const viewYear = ref(model.value?.year ?? dayjs.utc().year())

watch(
  () => model.value?.year,
  (year) => {
    if (year !== undefined) viewYear.value = year
  }
)

const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function buildWeekFromMonth(year: number, month: number): Week {
  const day = dayjs.utc().year(year).month(month).startOf('month')
  return {
    month,
    year,
    isoWeek: day.isoWeek(),
    formatted: formatIsoWeekRange(day),
    isoString: day.startOf('isoWeek').toISOString()
  }
}

function isSelected(monthIdx: number): boolean {
  return Boolean(model.value && model.value.year === viewYear.value && model.value.month === monthIdx)
}

function selectMonth(monthIdx: number) {
  model.value = buildWeekFromMonth(viewYear.value, monthIdx)
  isMonthPickerOpen.value = false
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
  model.value = buildWeekFromMonth(year, month)
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
  model.value = buildWeekFromMonth(year, month)
}
</script>
