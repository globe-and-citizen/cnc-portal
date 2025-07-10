<template>
  <div
    class="flex flex-col sm:flex-wrap md:flex-row md:items-center md:justify-between gap-2 mb-4 w-full max-w-full overflow-x-hidden"
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
            <span>{{ dayjs(model).format('MMMM YYYY') }}</span>
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
import { ref } from 'vue'
import ButtonUI from '@/components/ButtonUI.vue'
import VueDatePicker from '@vuepic/vue-datepicker'
import dayjs from 'dayjs'
import { Icon as IconifyIcon } from '@iconify/vue'
import { watch } from 'vue'

const model = defineModel<Date>({
  default: () => {
    return dayjs().startOf('month').toDate()
  }
})

const monthPicked = ref<{ month: number; year: number } | null>(null)

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
