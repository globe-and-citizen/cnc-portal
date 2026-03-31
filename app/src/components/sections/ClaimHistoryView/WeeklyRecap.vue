<template>
  <div class="w-full bg-white">
    <div class="stats w-full shadow-sm">
      <!-- Total Hours -->
      <div class="stat place-items-center">
        <div class="stat-title">Total Hours</div>

        <div class="mb-2">
          <span
            v-if="isSignedClaim"
            class="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-800"
          >
            <span class="inline-block h-1.5 w-1.5 rounded-full bg-sky-600" />
            Done
          </span>
          <span
            v-else-if="props.weeklyClaim && hasOvertimeWage && overtimeHoursWorked > 0"
            class="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800"
          >
            <span class="inline-block h-1.5 w-1.5 rounded-full bg-amber-600" />
            Currently in overtime
          </span>
          <span
            v-else-if="props.weeklyClaim"
            class="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800"
          >
            <span class="inline-block h-1.5 w-1.5 rounded-full bg-emerald-600" />
            Submitted
          </span>
          <span
            v-else
            class="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600"
          >
            <span class="inline-block h-1.5 w-1.5 rounded-full bg-gray-400" />
            Waiting
          </span>
        </div>

        <div class="text-xl font-bold">{{ submittedHours }}h</div>

        <span class="text-center text-sm text-gray-500" v-if="props.weeklyClaim && hasOvertimeWage">
          of {{ effectiveWage?.maximumHoursPerWeek ?? '-' }} hrs weekly limit &amp;
          {{ effectiveWage?.maximumOvertimeHoursPerWeek ?? '-' }} overtime hrs
        </span>
        <span class="text-sm text-gray-500" v-else-if="props.weeklyClaim">
          of {{ effectiveWage?.maximumHoursPerWeek ?? '-' }} hrs weekly limit
        </span>
        <span class="text-center text-sm text-gray-500" v-else-if="hasOvertimeWage">
          {{ effectiveWage?.maximumHoursPerWeek ?? '-' }} hrs available this week &amp;
          {{ effectiveWage?.maximumOvertimeHoursPerWeek ?? '-' }} overtime hrs available
        </span>
        <span class="text-sm text-gray-500" v-else>
          {{ effectiveWage?.maximumHoursPerWeek ?? '-' }} hrs available this week
        </span>
      </div>

      <!-- Hourly Rate -->
      <div class="stat place-items-center">
        <div class="stat-title">Hourly Rate</div>
        <div class="text-center text-xl">
          <RateDotList :rates="effectiveWage?.ratePerHour || []" :text-class="'text-center'" />
        </div>
        <div class="mt-1 text-center text-sm text-gray-500">
          ≃ ${{ hourlyRateInUserCurrency.toFixed(2) }} {{ currencyStore.localCurrency.code }}/h
        </div>
      </div>

      <!-- Overtime Rate (only when overtime wage is configured) -->
      <div v-if="hasOvertimeWage" class="stat place-items-center">
        <div class="stat-title">Overtime Rate</div>
        <div class="text-center text-xl">
          <RateDotList
            :rates="(effectiveWage?.overtimeRatePerHour as RatePerHour[]) || []"
            :text-class="'text-center'"
          />
        </div>

        <div class="mt-1 text-center text-sm text-gray-500">
          ≃ ${{ overtimeHourlyRateInUserCurrency.toFixed(2) }}
          {{ currencyStore.localCurrency.code }}/h
        </div>
      </div>

      <!-- Total Amount -->
      <div class="stat place-items-center">
        <div class="stat-title">Total Amount</div>
        <div class="text-center text-xl">
          <template v-if="props.weeklyClaim">
            <RateDotList :rates="combinedTokenAmounts" :text-class="'text-center'" />
          </template>
          <span v-else class="text-gray-300">—</span>
        </div>
        <div class="mt-1 flex gap-2 text-center text-sm text-gray-500">
          <template v-if="props.weeklyClaim">
            ≃ ${{ totalAmount }} {{ currencyStore.localCurrency.code }}
          </template>
          <!-- <template v-else>Submit hours to calculate</template> -->
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useCurrencyStore } from '@/stores'
import type { RatePerHour, Wage, WeeklyClaim } from '@/types/cash-remuneration'
import RateDotList from '@/components/RateDotList.vue'

const props = defineProps<{
  weeklyClaim?: WeeklyClaim
  wage?: Wage
}>()

const currencyStore = useCurrencyStore()

const effectiveWage = computed(() => props.weeklyClaim?.wage ?? props.wage)
const submittedHours = computed(() => props.weeklyClaim?.hoursWorked ?? 0)

const hasOvertimeWage = computed(() => {
  const rates = effectiveWage.value?.overtimeRatePerHour
  return Array.isArray(rates) && rates.length > 0
})

const isSignedClaim = computed(
  () => props.weeklyClaim?.status === 'signed' || props.weeklyClaim?.status === 'withdrawn'
)

const regularHoursWorked = computed(() => {
  if (!hasOvertimeWage.value) return submittedHours.value
  return Math.min(
    submittedHours.value,
    effectiveWage.value?.maximumHoursPerWeek ?? submittedHours.value
  )
})

const overtimeHoursWorked = computed(() => {
  if (!hasOvertimeWage.value) return 0
  return Math.max(
    0,
    submittedHours.value - (effectiveWage.value?.maximumHoursPerWeek ?? submittedHours.value)
  )
})

function getHourlyRateInUserCurrency(
  ratePerHour: RatePerHour[],
  tokenStore = currencyStore
): number {
  return ratePerHour.reduce((total: number, rate: RatePerHour) => {
    const tokenInfo = tokenStore.getTokenInfo(rate.type)
    const localPrice = tokenInfo?.prices.find((p) => p.id === 'local')?.price ?? 0
    return total + rate.amount * localPrice
  }, 0)
}

const hourlyRateInUserCurrency = computed(() =>
  effectiveWage.value?.ratePerHour
    ? getHourlyRateInUserCurrency(effectiveWage.value.ratePerHour)
    : 0
)

const overtimeHourlyRateInUserCurrency = computed(() =>
  effectiveWage.value?.overtimeRatePerHour
    ? getHourlyRateInUserCurrency(effectiveWage.value.overtimeRatePerHour as RatePerHour[])
    : 0
)

const combinedTokenAmounts = computed(() => {
  const result = new Map<string, number>()
  const regHours = regularHoursWorked.value

  for (const rate of effectiveWage.value?.ratePerHour ?? []) {
    result.set(rate.type, (result.get(rate.type) ?? 0) + rate.amount * regHours)
  }

  if (hasOvertimeWage.value) {
    const otHours = overtimeHoursWorked.value
    for (const rate of (effectiveWage.value?.overtimeRatePerHour as RatePerHour[]) ?? []) {
      result.set(rate.type, (result.get(rate.type) ?? 0) + rate.amount * otHours)
    }
  }

  return Array.from(result.entries()).map(([type, amount]) => ({ type, amount }))
})

const totalAmount = computed(() => {
  const regularTotal = regularHoursWorked.value * hourlyRateInUserCurrency.value
  const overtimeTotal = overtimeHoursWorked.value * overtimeHourlyRateInUserCurrency.value
  return (regularTotal + overtimeTotal).toFixed(2)
})
</script>
