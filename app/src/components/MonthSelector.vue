<template>
  <div class="flex items-center justify-between mb-4 w-full">
    <ButtonUI @click="goToPrevMonth">
      <IconifyIcon icon="heroicons:chevron-left" class="w-4 h-4" />
      Prev
    </ButtonUI>
    <div class="relative">
      <VueDatePicker
        v-model="monthPicked"
        :month-picker="true"
        :year-picker="true"
        auto-apply
        class="bg-white rounded shadow"
      >
        <template #trigger>
          <ButtonUI @click="toggleMonthPicker">
            {{ dayjs(model).format('MMMM YYYY') }}
            <IconifyIcon icon="heroicons:chevron-down" class="w-4 h-4" />
          </ButtonUI>
        </template>
      </VueDatePicker>
    </div>
    <ButtonUI @click="goToNextMonth">
      Next
      <IconifyIcon icon="heroicons:chevron-right" class="w-4 h-4" />
    </ButtonUI>
  </div>
</template>

<script setup lang="ts">
import { ref, defineModel } from 'vue'
import ButtonUI from '@/components/ButtonUI.vue'
import VueDatePicker from '@vuepic/vue-datepicker'
import dayjs from 'dayjs'
import { Icon as IconifyIcon } from '@iconify/vue'

const model = defineModel({
  default: () => {
    return dayjs().startOf('month').toDate()
  }
})

const monthPicked = ref<{ month: number; year: number } | null>(null)

import { watch } from 'vue'

watch(monthPicked, (newVal) => {
  if (newVal && typeof newVal.month === 'number' && typeof newVal.year === 'number') {
    model.value = dayjs().year(newVal.year).month(newVal.month).startOf('month').toDate()
  }
})

watch(model, (newVal) => {
  const month = dayjs(newVal).month()
  const year = dayjs(newVal).year()
  if (!monthPicked.value || monthPicked.value.month !== month || monthPicked.value.year !== year) {
    monthPicked.value = { month, year }
  }
})

const isMonthPickerOpen = ref(false)

function goToPrevMonth() {
  model.value = dayjs(model.value).subtract(1, 'month').toDate()
}

function goToNextMonth() {
  model.value = dayjs(model.value).add(1, 'month').toDate()
}

function toggleMonthPicker() {
  isMonthPickerOpen.value = !isMonthPickerOpen.value
}
</script>
