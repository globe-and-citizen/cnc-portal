<template>
  <div
    class="flex flex-col sm:flex-wrap md:flex-row md:items-center md:justify-between gap-2 mb-4 w-full max-w-full "
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
            <span>{{ dayjs().year(model.year).month(model.month).format('MMMM YYYY') }}</span>
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
import { Icon as IconifyIcon } from '@iconify/vue'

dayjs.extend(utc)

interface MonthYear {
  month: number
  year: number
}

const model = defineModel<MonthYear>({
  default: () => {
    const now = dayjs().utc()
    return { month: now.month(), year: now.year() }
  }
})

// monthPicked is { month, year }
const monthPicked = ref<MonthYear | null>(null)

// When monthPicked changes, update model
watch(monthPicked, (newVal) => {
  if (newVal && typeof newVal.month === 'number' && typeof newVal.year === 'number') {
    model.value = { month: newVal.month, year: newVal.year }
  }
})

// When model changes, update monthPicked
watch(model, (newVal) => {
  if (!monthPicked.value || monthPicked.value.month !== newVal.month || monthPicked.value.year !== newVal.year) {
    monthPicked.value = { month: newVal.month, year: newVal.year }
  }
})

const isMonthPickerOpen = ref(false)

function goToPrevMonth() {
  let { month, year } = model.value
  if (month === 0) {
    month = 11
    year -= 1
  } else {
    month -= 1
  }
  model.value = { month, year }
}

function goToNextMonth() {
  let { month, year } = model.value
  if (month === 11) {
    month = 0
    year += 1
  } else {
    month += 1
  }
  model.value = { month, year }
}

function toggleMonthPicker() {
  isMonthPickerOpen.value = !isMonthPickerOpen.value
}
</script>
