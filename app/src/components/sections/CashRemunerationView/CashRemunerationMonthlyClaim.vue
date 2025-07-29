<template>
  <OverviewCard
    :title="totalMonthlyWithdrawnAmount"
    subtitle="Month Claimed"
    variant="warning"
    :card-icon="cartIcon"
    :loading="isFetching"
  >
    <div class="flex flex-row gap-1 text-black">
      <img :src="uptrendIcon" alt="status-icon" />
      <div>
        <span class="font-semibold text-sm" data-test="percentage-increase">+ 26.3% </span>
        <span class="font-medium text-[#637381] text-xs">than last week</span>
      </div>
    </div>
  </OverviewCard>
</template>

<script setup lang="ts">
import cartIcon from '@/assets/cart.svg'
import uptrendIcon from '@/assets/uptrend.svg'
import OverviewCard from '@/components/OverviewCard.vue'
import { useCurrencyStore, useTeamStore, useToastStore } from '@/stores'
import { formatCurrencyShort, log } from '@/utils'
import { watch, computed } from 'vue'
import { useTanstackQuery } from '@/composables/useTanstackQuery'
import { useStorage } from '@vueuse/core'
import type { TokenId } from '@/constant'
import type { RatePerHour } from '@/types/cash-remuneration'

const teamStore = useTeamStore()
const toastStore = useToastStore()
const currencyStore = useCurrencyStore()

const currency = useStorage('currency', {
  code: 'USD',
  name: 'US Dollar',
  symbol: '$'
})

const {
  data: withdrawnClaims,
  isLoading: isFetching,
  error
} = useTanstackQuery(
  'withdrawnClaims',
  computed(() => `/weeklyClaim/?teamId=${teamStore.currentTeamId}&status=withdrawn`),
  {
    refetchInterval: 10000, // auto reload every 10s
    refetchOnWindowFocus: true
  }
)

function getTotalHoursWorked(claims: { hoursWorked: number }[]) {
  return claims.reduce((sum, claim) => sum + claim.hoursWorked, 0)
}

function getHoulyRateInUserCurrency(ratePerHour: RatePerHour, tokenStore = currencyStore): number {
  return ratePerHour.reduce((total: number, rate: { type: TokenId; amount: number }) => {
    const tokenInfo = tokenStore.getTokenInfo(rate.type as TokenId)
    const localPrice = tokenInfo?.prices.find((p) => p.id === 'local')?.price ?? 0
    return total + rate.amount * localPrice
  }, 0)
}

// fonction for getting the current month key (ex: '2025-07')
function getCurrentMonthKey() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

// Stores the current month to detect month change

const lastMonthKey = useStorage('lastMonthKey', getCurrentMonthKey())

function resetMonthlyCounterIfNeeded() {
  const currentMonthKey = getCurrentMonthKey()
  if (lastMonthKey.value !== currentMonthKey) {
    lastMonthKey.value = currentMonthKey
    return true // show the reset state
  }
  return false
}

const totalMonthlyWithdrawnAmount = computed(() => {
  // Reset the counter to 0 if the month changed
  if (resetMonthlyCounterIfNeeded()) {
    return formatCurrencyShort(0, currency.value.code)
  }
  if (!withdrawnClaims.value) return ''

  let total = 0
  withdrawnClaims.value.forEach((weeklyClaim) => {
    const hours = getTotalHoursWorked(weeklyClaim.claims)
    const rate = getHoulyRateInUserCurrency(weeklyClaim.wage.ratePerHour)
    total += hours * rate
  })

  return formatCurrencyShort(total, currency.value.code)
})

watch(error, (err) => {
  if (err) {
    toastStore.addErrorToast('Failed to fetch monthly withdrawn amount')
    log.error('Failed to fetch monthly withdrawn amount', err)
  }
})
</script>
