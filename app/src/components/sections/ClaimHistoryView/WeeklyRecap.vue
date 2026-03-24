<template>
  <div class="flex-1 space-y-6 bg-white">
    <div class="stats shadow-sm w-full">
      <div class="stat place-items-center">
        <div class="stat-title">Total Hours</div>
        <div class="font-bold text-xl">{{ submittedHours }}h</div>
        <span class="text-sm text-gray-500" v-if="props.weeklyClaim && hasOvertimeWage">
          of {{ effectiveWage?.maximumHoursPerWeek ?? '-' }} hrs weekly limit &amp;
          {{ effectiveWage?.maximumOvertimeHoursPerWeek ?? '-' }} overtime hrs
        </span>
        <span class="text-sm text-gray-500" v-else-if="props.weeklyClaim">
          of {{ effectiveWage?.maximumHoursPerWeek ?? '-' }} hrs weekly limit
        </span>
        <span class="text-sm text-gray-500" v-else-if="hasOvertimeWage">
          {{ effectiveWage?.maximumHoursPerWeek ?? '-' }} hrs available this week &amp;
          {{ effectiveWage?.maximumOvertimeHoursPerWeek ?? '-' }} overtime hrs available
        </span>
        <span class="text-sm text-gray-500" v-else>
          {{ effectiveWage?.maximumHoursPerWeek ?? '-' }} hrs available this week
        </span>
      </div>

      <!-- Overtime Hourly Rate (only shown when overtime wage is defined) -->
      <div v-if="hasOvertimeWage" class="stat place-items-center">
        <div class="stat-title">Overtime Rate</div>
        <div class="font-bold text-xl text-center">
          <RatePerHourList
            :rate-per-hour="(effectiveWage?.overtimeRatePerHour as RatePerHour[]) || []"
            :currency-symbol="currencyStore.getTokenInfo('native')?.symbol || 'NATIVE'"
          />
        </div>
        <div class="text-sm text-gray-500 text-center mt-1">
          ≃ ${{ overtimeHourlyRateInUserCurrency.toFixed(2) }}
          {{ currencyStore.localCurrency.code }}/h
        </div>
      </div>

      <div class="stat place-items-center">
        <div class="stat-title">Hourly Rate</div>
        <div class="font-bold text-xl text-center">
          <RatePerHourList
            :rate-per-hour="effectiveWage?.ratePerHour || []"
            :currency-symbol="currencyStore.getTokenInfo('native')?.symbol || 'NATIVE'"
          />
        </div>
        <div class="text-sm text-gray-500 text-center mt-1">
          ≃ ${{ hourlyRateInUserCurrency.toFixed(2) }} {{ currencyStore.localCurrency.code }}/h
        </div>
      </div>

      <div class="stat place-items-center">
        <div class="stat-title">Total Amount</div>
        <div class="font-bold text-xl">
          <RatePerHourTotalList
            v-if="props.weeklyClaim"
            :rate-per-hour="combinedTokenAmounts"
            :currency-symbol="currencyStore.getTokenInfo('native')?.symbol || 'NATIVE'"
            :total-hours="1"
          />
        </div>
        <div class="text-sm text-gray-500 flex gap-2 mt-1">
          ≃ ${{ totalAmount }} {{ currencyStore.localCurrency.code }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useCurrencyStore } from '@/stores'
import RatePerHourList from '@/components/RatePerHourList.vue'
import RatePerHourTotalList from '@/components/RatePerHourTotalList.vue'
import type { RatePerHour, Wage, WeeklyClaim } from '@/types/cash-remuneration'

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

// function to format the hourly rate in user's local currency
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

const hourlyRateInUserCurrency = computed(() => {
  return effectiveWage.value?.ratePerHour
    ? getHourlyRateInUserCurrency(effectiveWage.value.ratePerHour)
    : 0
})

const overtimeHourlyRateInUserCurrency = computed(() => {
  return effectiveWage.value?.overtimeRatePerHour
    ? getHourlyRateInUserCurrency(effectiveWage.value.overtimeRatePerHour as RatePerHour[])
    : 0
})

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
