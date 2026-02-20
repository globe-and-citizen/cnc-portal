<template>
  <div class="flex-1 space-y-6 bg-white">
    <div class="stats shadow-sm w-full">
      <div class="stat place-items-center">
        <div class="stat-title">Total Hours</div>
        <div class="font-bold text-xl">{{ submittedHours }}h</div>
        <span class="text-sm text-gray-500" v-if="props.weeklyClaim"
          >of {{ effectiveWage?.maximumHoursPerWeek ?? '-' }} hrs weekly limit</span
        >
        <span class="text-sm text-gray-500" v-else
          >{{ effectiveWage?.maximumHoursPerWeek ?? '-' }} hrs available this week</span
        >
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
            v-if="weeklyClaim"
            :rate-per-hour="props.weeklyClaim?.wage?.ratePerHour || []"
            :currency-symbol="currencyStore.getTokenInfo('native')?.symbol || 'NATIVE'"
            :total-hours="weeklyClaim.hoursWorked"
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

const totalAmount = computed(() => {
  const hours = submittedHours.value
  const total = hours * hourlyRateInUserCurrency.value
  return total.toFixed(2)
})
</script>
