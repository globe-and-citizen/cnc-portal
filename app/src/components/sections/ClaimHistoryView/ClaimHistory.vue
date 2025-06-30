<template>
  <div class="flex bg-transparent p-6 gap-x-4">
    <!-- Left Sidebar -->
    <div class="w-1/3 bg-white border border-gray-300 rounded-xl p-6 space-y-6 shadow-sm">
      <!-- Month Selector -->
      <div class="flex items-center justify-between mb-4">
        <ButtonUI>
          <IconifyIcon icon="heroicons:chevron-left" class="w-4 h-4" />
          Prev
        </ButtonUI>
        <ButtonUI>
          actual
          <IconifyIcon icon="heroicons:chevron-down" class="w-4 h-4" />
        </ButtonUI>
        <ButtonUI>
          Next
          <IconifyIcon icon="heroicons:chevron-right" class="w-4 h-4" />
        </ButtonUI>
      </div>

      <!-- Week List -->
      <div class="space-y-2">
        <div
          v-for="week in weeks"
          :key="week.id"
          @click="selectWeek(week)"
          :class="[
            'border rounded-lg p-3 cursor-pointer',
            selectedWeek?.id === week.id
              ? 'bg-blue-100 border-blue-500 text-gray-800'
              : 'hover:bg-gray-50'
          ]"
        >
          <div class="text-sm font-medium">Week</div>
          <div
            class="text-xs"
            :class="selectedWeek?.id === week.id ? 'text-blue-600  ' : 'text-gray-800'"
          >
            {{ formatDate(week.start) }}
          </div>
        </div>
      </div>
      <!-- Graph (Placeholder) -->
    </div>

    <!-- Right Content -->
    <div class="flex-1 bg-white border border-gray-300 rounded-xl p-8 shadow-sm">
      <!-- Summary Top Bar -->
      <div class="flex items-center justify-between border-b pb-4 mb-6">
        <div class="text-center">
          <div class="text-sm text-gray-500">Total Hours</div>
          <div class="text-2xl font-bold">{{ totalHours }}h</div>
        </div>
        <div class="text-center">
          <div class="text-sm text-gray-500">Hourly Rate</div>
          <div class="text-2xl font-bold">${{ hourlyRate }}</div>
          <div class="text-xs text-gray-400">10 USDC, 10 POL, 10 SHER</div>
        </div>
        <div class="text-center">
          <div class="text-sm text-gray-500">Total Amount</div>
          <div class="text-2xl font-bold text-green-600">${{ totalAmount }}</div>
        </div>
      </div>

      <!-- Daily Claims -->
      <div v-if="selectedWeek">
        <h2 class="text-lg font-semibold mb-4">
          Weekly Claims: {{ formatDate(selectedWeek.start) }}
        </h2>

        <div
          v-for="(entry, index) in selectedWeek.claims"
          :key="index"
          :class="[
            'flex items-center justify-between border px-4 py-3 mb-2 rounded-lg',
            entry.hours > 0 ? 'bg-green-50 text-green-900' : 'bg-gray-100 text-gray-400'
          ]"
        >
          <div class="flex items-center gap-2">
            <span
              class="h-3 w-3 rounded-full"
              :class="entry.hours > 0 ? 'bg-green-500' : 'bg-gray-300'"
            />
            <span class="font-medium">{{ formatDayLabel(entry.date) }}</span>
          </div>
          <div class="text-sm flex items-center gap-2">
            <IconifyIcon icon="heroicons:clock" class="w-4 h-4 text-gray-500" />
            {{ entry.hours }} hours
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
// import Datepicker from '@vuepic/vue-datepicker'
import dayjs from 'dayjs'
import ButtonUI from '@/components/ButtonUI.vue'
import { Icon as IconifyIcon } from '@iconify/vue'
import { getMondayStart, getSundayEnd } from '@/utils/dayUtils'

const selectedMonth = ref(new Date())
const selectedWeek = ref(null)
const hourlyRate = 20

// Génère dynamiquement les semaines du mois sélectionné
const weeks = ref([])

const generateWeeks = () => {
  const start = dayjs(selectedMonth.value).startOf('month')
  const end = dayjs(selectedMonth.value).endOf('month')
  const result = []

  // Commence la semaine par lundi
  let cursor = start.startOf('week').add(1, 'day') // Commence par lundi
  if (cursor.isAfter(start)) {
    cursor = cursor.subtract(7, 'day')
  }

  let id = 0

  while (cursor.isBefore(end) || cursor.isSame(end, 'week')) {
    const startWeek = cursor
    const endWeek = cursor.add(6, 'day')

    result.push({
      id: ++id,
      start: startWeek.toDate(),
      end: endWeek.toDate(),
      claims: Array(7)
        .fill(null)
        .map((_, i) => {
          const date = startWeek.add(i, 'day')
          return {
            date: date.toDate(),
            day: date.format('dddd'),
            hours: Math.floor(Math.random() * 9) // simulate data
          }
        })
    })

    cursor = cursor.add(7, 'day')
  }

  weeks.value = result
  selectedWeek.value = result[1] || result[0] // Sélection par défaut : 2ème semaine ou 1ère si pas de 2ème
}

watch(selectedMonth, generateWeeks, { immediate: true })

const selectWeek = (week) => {
  selectedWeek.value = week
}

function formatDate(date: string | Date) {
  const monday = getMondayStart(new Date(date))
  const sunday = getSundayEnd(new Date(date))
  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  const locale = navigator.language || 'en-US'
  return `${monday.toLocaleDateString(locale, options)}-${sunday.toLocaleDateString(locale, options)}`
}

function formatDayLabel(date: string | Date) {
  const d = new Date(date)
  const locale = navigator.language || 'en-US'
  const day = d.toLocaleDateString(locale, { weekday: 'long' })
  const dayNum = d.getDate()
  const month = d.toLocaleDateString(locale, { month: 'long' })
  return `${day} ${dayNum} ${month}`
}
</script>

<style scoped>
/* Light border and animation enhancement */
</style>
