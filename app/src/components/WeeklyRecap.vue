<template>
  <div class="flex-1 space-y-6">
    <div class="stats shadow w-full">
      <div class="stat place-items-center">
        <div class="stat-title">Total Hours</div>
        <div class="font-bold text-xl">{{ totalHour }}h</div>
        <span class="text-sm text-gray-500"
          >of {{ props.weeklyClaim?.wage?.maximumHoursPerWeek ?? '-' }} hrs weekly limit</span
        >
      </div>

      <div class="stat place-items-center">
        <div class="stat-title">Hourly Rate</div>
        <div class="font-bold text-xl">
          <RatePerHourList
            :rate-per-hour="props.weeklyClaim?.wage?.ratePerHour || []"
            :currency-symbol="currencyStore.getTokenInfo('native')?.symbol || 'NATIVE'"
          />
        </div>
        <div class="text-sm text-gray-500 flex gap-2 mt-1">
          ≃ ${{ hourlyRateInUserCurrency.toFixed(2) }} {{ currencyStore.localCurrency.code }}
        </div>
      </div>

      <div class="stat place-items-center">
        <div class="stat-title">Total Amount</div>
        <div class="font-bold text-xl">
          <RatePerHourTotalList
            :rate-per-hour="props.weeklyClaim?.wage?.ratePerHour || []"
            :currency-symbol="currencyStore.getTokenInfo('native')?.symbol || 'NATIVE'"
            :total-hours="totalHour"
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

const props = defineProps({
  weeklyClaim: {
    type: Object,
    required: false
  }
})

const currencyStore = useCurrencyStore()

type TokenId = Parameters<typeof currencyStore.getTokenInfo>[0]

interface Rate {
  type: TokenId
  amount: number
}

interface Claim {
  hoursWorked: number
}

// function to format the hourly rate in user's local currency
function getHoulyRateInUserCurrency(ratePerHour: Rate[], tokenStore = currencyStore): number {
  return ratePerHour.reduce((total: number, rate: Rate) => {
    const tokenInfo = tokenStore.getTokenInfo(rate.type)
    const localPrice = tokenInfo?.prices.find((p) => p.id === 'local')?.price ?? 0
    return total + rate.amount * localPrice
  }, 0)
}

// function getHourlyRate(ratePerHour: Rate[], type: string): number {
//   if (!Array.isArray(ratePerHour)) return 0
//   return ratePerHour.reduce((total: number, rate: Rate) => {
//     if (rate.type !== type) return total
//     return total + rate.amount
//   }, 0)
// }

// Function to calculate total hours worked from claims
function getTotalHoursWorked(claims: Claim[]): number {
  return claims.reduce((sum: number, claim: Claim) => sum + claim.hoursWorked, 0)
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
