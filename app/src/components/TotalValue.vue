<template>
  <div class="flex-1 space-y-6">
    <div class="stats shadow w-full">
      <div class="stat place-items-center">
        <div class="stat-title">Total Hours</div>
        <div class="stat-value">{{ totalHour }}h</div>
      </div>

      <div class="stat place-items-center">
        <div class="stat-title">Hourly Rate</div>
        <div class="stat-value text-secondary">
          {{ hourlyRateInUserCurrency.toFixed(2) }} {{ currencyStore.localCurrency.code }}
        </div>
        <div class="text-sm text-gray-500 flex gap-2 mt-1">
          <span>
            {{ getHourlyRate(props.weeklyClaim?.wage?.ratePerHour, 'native') }}
            {{ currencyStore.getTokenInfo('native')?.symbol || 'NATIVE' }}
          </span>
          <span>
            {{ getHourlyRate(props.weeklyClaim?.wage?.ratePerHour, 'sher') }}
            {{ currencyStore.getTokenInfo('sher')?.symbol || 'SHER' }}
          </span>
          <span>
            {{ getHourlyRate(props.weeklyClaim?.wage?.ratePerHour, 'usdc') }}
            {{ currencyStore.getTokenInfo('usdc')?.symbol || 'USDC' }}
          </span>
        </div>
      </div>

      <div class="stat place-items-center">
        <div class="stat-title">Total Amount</div>
        <div class="stat-value">{{ totalAmount }} {{ currencyStore.localCurrency.code }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useCurrencyStore } from '@/stores'

const props = defineProps({
  weeklyClaim: {
    type: Object,
    required: false
  }
})

const currencyStore = useCurrencyStore()

// function to format the hourly rate in user's local currency
function getHoulyRateInUserCurrency(ratePerHour, tokenStore = currencyStore) {
  return ratePerHour.reduce((total, rate) => {
    const tokenInfo = tokenStore.getTokenInfo(rate.type)
    const localPrice = tokenInfo?.prices.find((p) => p.id === 'local')?.price ?? 0
    return total + rate.amount * localPrice
  }, 0)
}

function getHourlyRate(ratePerHour, type: string) {
  if (!Array.isArray(ratePerHour)) return 0
  return ratePerHour.reduce((total, rate) => {
    if (rate.type !== type) return total
    return total + rate.amount
  }, 0)
}

// Function to calculate total hours worked from claims
function getTotalHoursWorked(claims) {
  return claims.reduce((sum, claim) => sum + claim.hoursWorked, 0)
}

// Computed properties
const totalHour = computed(() => {
  return props.weeklyClaim?.claims ? getTotalHoursWorked(props.weeklyClaim.claims) : 0
})

const hourlyRateInUserCurrency = computed(() => {
  return props.weeklyClaim?.wage?.ratePerHour
    ? getHoulyRateInUserCurrency(props.weeklyClaim.wage.ratePerHour)
    : 0
})

const totalAmount = computed(() => {
  const total = totalHour.value * hourlyRateInUserCurrency.value
  return total.toFixed(2)
})
</script>
