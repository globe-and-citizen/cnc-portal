<template>
  <div class="flex bg-transparent p-6 gap-x-4">
    <!-- Left Sidebar -->
    <div class="w-1/3 bg-white border border-gray-300 rounded-xl p-6 space-y-6 shadow-sm">
      <!-- Month Selector -->
      <div>
        <Datepicker
          v-model="selectedMonth"
          :month-picker="true"
          auto-apply
          :format="monthFormat"
          class="w-full"
        />
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
              ? 'bg-blue-100 border-blue-500 text-blue-800'
              : 'hover:bg-gray-50'
          ]"
        >
          <div class="text-sm font-medium">Week</div>
          <div class="text-xs">{{ formatDateRange(week.start, week.end) }}</div>
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
          Weekly Claims: {{ formatDateRange(selectedWeek.start, selectedWeek.end) }}
        </h2>

        <div
          v-for="(entry, index) in selectedWeek.claims"
          :key="index"
          :class="[
            'flex items-center justify-between border px-4 py-3 mb-2 rounded',
            entry.hours > 0 ? 'bg-green-50 text-green-900' : 'bg-gray-100 text-gray-400'
          ]"
        >
          <div class="flex items-center gap-2">
            <span
              class="h-3 w-3 rounded-full"
              :class="entry.hours > 0 ? 'bg-green-600' : 'bg-gray-400'"
            />
            <span class="font-medium">{{ entry.day }} {{ formatDay(entry.date) }}</span>
          </div>
          <div class="text-sm flex items-center gap-1">
            <svg
              class="w-4 h-4"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6l4 2" />
            </svg>
            {{ entry.hours }} hours
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import Datepicker from '@vuepic/vue-datepicker'
import dayjs from 'dayjs'

const selectedMonth = ref(new Date())
const selectedWeek = ref(null)
const hourlyRate = 20

// Génère dynamiquement les semaines du mois sélectionné
const weeks = ref([])

watch(
  selectedMonth,
  () => {
    const start = dayjs(selectedMonth.value).startOf('month')
    const end = dayjs(selectedMonth.value).endOf('month')
    const result = []

    let cursor = start.startOf('week')
    let id = 0

    while (cursor.isBefore(end)) {
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
    selectedWeek.value = result[1] // Sélection par défaut : 2ème semaine
  },
  { immediate: true }
)

const selectWeek = (week) => {
  selectedWeek.value = week
}

const formatDateRange = (start, end) => {
  return `${dayjs(start).format('MMM D')} – ${dayjs(end).format('MMM D')}`
}

const formatDay = (date) => {
  return dayjs(date).format('D MMMM')
}

const totalHours = computed(
  () => selectedWeek.value?.claims.reduce((sum, entry) => sum + entry.hours, 0) ?? 0
)

const totalAmount = computed(() => totalHours.value * hourlyRate)

const monthFormat = (date) => {
  return dayjs(date).format('MMMM YYYY')
}
</script>

<style scoped>
/* Light border and animation enhancement */
</style>
