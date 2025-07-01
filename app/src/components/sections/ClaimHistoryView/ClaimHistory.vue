<template>
  <div class="flex bg-transparent gap-x-4">
    <!-- Left Sidebar -->
    <CardComponent class="w-1/3">
      <div class="space-y-8">
        <!-- Month Selector -->
        <div class="flex items-center justify-between mb-4">
          <ButtonUI @click="goToPrevMonth">
            <IconifyIcon icon="heroicons:chevron-left" class="w-4 h-4" />
            Prev
          </ButtonUI>
          <div class="relative">
            <ButtonUI @click="toggleMonthPicker">
              {{ currentMonthLabel }}
              <IconifyIcon icon="heroicons:chevron-down" class="w-4 h-4" />
            </ButtonUI>

            <!-- Afficher le date picker seulement si ouvert -->
            <div v-if="isMonthPickerOpen" class="absolute z-50 mt-2 left-1/2 -translate-x-1/2">
              <VueDatePicker
                v-model="monthPickerDate"
                :month-picker="true"
                auto-apply
                class="bg-white rounded shadow"
              />
            </div>
          </div>
          <ButtonUI @click="goToNextMonth">
            Next
            <IconifyIcon icon="heroicons:chevron-right" class="w-4 h-4" />
          </ButtonUI>
        </div>

        <!-- Week List -->
        <div class="space-y-4">
          <div
            v-for="week in weeks"
            :key="week.id"
            @click="selectWeek(week)"
            :class="[
              'border rounded-lg p-3 cursor-pointer',
              selectedWeek?.id === week.id
                ? 'bg-emerald-100 border-emerald-500 text-gray-800'
                : 'hover:bg-gray-50'
            ]"
          >
            <div class="text-sm font-medium">Week</div>
            <div
              class="text-xs"
              :class="selectedWeek?.id === week.id ? 'text-emerald-900' : 'text-gray-800'"
            >
              {{ formatDate(week.start) }}
            </div>
          </div>
        </div>
      </div>
    </CardComponent>

    <!-- Right Content -->
    <div class="flex-1 space-y-6">
      <div class="stats shadow w-full">
        <div class="stat place-items-center">
          <div class="stat-title">Total Hours</div>
          <div class="stat-value">{{ totalHours }}h</div>
        </div>

        <div class="stat place-items-center">
          <div class="stat-title">Hourly Rate</div>
          <div class="stat-value text-secondary">{{ hourlyRate }}$</div>
          <div class="stat-desc">10 USDC, 10 POL, 10 SHER</div>
        </div>

        <div class="stat place-items-center">
          <div class="stat-title">Total Amount</div>
          <div class="stat-value">{{ totalAmount }}$</div>
        </div>
      </div>

      <CardComponent title="" class="w-full">
        <div v-if="selectedWeek">
          <h2 class="pb-4">Weekly Claims: {{ formatDate(selectedWeek.start) }}</h2>

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
              <span class="font-medium">{{ formatDayLabel(entry.date) }} </span>
              <span class="text-sm text-gray-500">({{ weeklyClaim }})</span>
            </div>
            <div class="text-sm flex items-center gap-2">
              <IconifyIcon icon="heroicons:clock" class="w-4 h-4 text-gray-500" />
              {{ entry.hours }} hours
            </div>
          </div>
        </div>
      </CardComponent>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import dayjs from 'dayjs'
import ButtonUI from '@/components/ButtonUI.vue'
import { Icon as IconifyIcon } from '@iconify/vue'
import { getMondayStart, getSundayEnd } from '@/utils/dayUtils'
import VueDatePicker from '@vuepic/vue-datepicker'
import { useCustomFetch } from '@/composables/useCustomFetch'
import type { ClaimResponse } from '@/types'
import { useTeamStore } from '@/stores'
import CardComponent from '@/components/CardComponent.vue'

const teamStore = useTeamStore()
const teamId = computed(() => teamStore.currentTeam?.id)
const claimURL = computed(() => `/claim/?teamId=${teamId.value}`)

const { data: teamClaimData } = useCustomFetch(claimURL, { immediate: true, refetch: true }).json<
  Array<ClaimResponse>
>()
const selectedMonth = ref(new Date())
const selectedWeek = ref(null)
const hourlyRate = 20

// Ajout des variables pour le month picker
const isMonthPickerOpen = ref(false)
const monthPickerDate = ref(selectedMonth.value)

const weeks = ref([])

const generateWeeks = () => {
  const start = dayjs(selectedMonth.value).startOf('month')
  const end = dayjs(selectedMonth.value).endOf('month')
  const result = []

  // Indexer les claims par date (format YYYY-MM-DD)
  const claimsByDate: Record<string, ClaimResponse> = {}
  if (teamClaimData.value) {
    for (const claim of teamClaimData.value) {
      const dateKey = dayjs(claim.createdAt).format('YYYY-MM-DD')
      claimsByDate[dateKey] = claim
    }
  }

  let cursor = start.startOf('week').add(1, 'day')
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
          const dateKey = date.format('YYYY-MM-DD')
          const claim = claimsByDate[dateKey]
          return {
            date: date.toDate(),
            day: date.format('dddd'),
            hours: claim ? claim.hoursWorked : 0
          }
        })
    })

    cursor = cursor.add(7, 'day')
  }

  weeks.value = result
  selectedWeek.value = result[0] || null
}

watch(selectedMonth, generateWeeks, { immediate: true })

// Synchroniser le picker avec le mois sélectionné
watch(monthPickerDate, (val) => {
  if (val) {
    selectedMonth.value = val
    isMonthPickerOpen.value = false
  }
})

const selectWeek = (week) => {
  selectedWeek.value = week
}

const currentMonthLabel = computed(() => {
  const options: Intl.DateTimeFormatOptions = { month: 'long', year: 'numeric' }
  const locale = navigator.language || 'en-US'
  return new Date(selectedMonth.value).toLocaleDateString(locale, options)
})

function goToPrevMonth() {
  selectedMonth.value = dayjs(selectedMonth.value).subtract(1, 'month').toDate()
}

function goToNextMonth() {
  selectedMonth.value = dayjs(selectedMonth.value).add(1, 'month').toDate()
}

function toggleMonthPicker() {
  isMonthPickerOpen.value = !isMonthPickerOpen.value
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

// Fonction pour calculer le total d'heures travaillées dans la semaine sélectionnée
function getTotalHoursWorked() {
  if (!selectedWeek.value) return 0
  // On additionne les heures de chaque jour, en limitant à 24h/jour
  return selectedWeek.value.claims.reduce((sum, entry) => {
    const hours = Math.min(entry.hours, 24)
    return sum + hours
  }, 0)
}

const totalHours = computed(() => getTotalHoursWorked())
const totalAmount = computed(() => totalHours.value * hourlyRate)
</script>
