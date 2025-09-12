<template>
  <OverviewCard
    :title="totalPendingAmount"
    subtitle="Pending Claim"
    variant="info"
    :card-icon="personIcon"
    :loading="isFetching"
  >
    <div class="flex flex-row gap-1 text-black">
      <img :src="uptrendIcon" alt="status-icon" />
      <div>
        <span class="font-semibold text-sm" data-test="percentage-increase">+ 12.3% </span>
        <span class="font-medium text-[#637381] text-xs">than last week</span>
      </div>
    </div>
  </OverviewCard>
</template>

<script setup lang="ts">
import personIcon from '@/assets/person.svg'
import uptrendIcon from '@/assets/uptrend.svg'
import OverviewCard from '@/components/OverviewCard.vue'
import { useCurrencyStore, useTeamStore, useToastStore } from '@/stores'
import { formatCurrencyShort, log } from '@/utils'
import { watch, computed } from 'vue'
import { useTanstackQuery } from '@/composables/useTanstackQuery'
import { useStorage } from '@vueuse/core'
import type { TokenId } from '@/constant'
import type { RatePerHour } from '@/types/cash-remuneration'

// Interface pour typer les claims
interface WeeklyClaim {
  claims: { hoursWorked: number }[]
  wage: {
    ratePerHour: RatePerHour
  }
}

const teamStore = useTeamStore()
const toastStore = useToastStore()
const currencyStore = useCurrencyStore()

const currency = useStorage('currency', {
  code: 'USD',
  name: 'US Dollar',
  symbol: '$'
})
const signedQueryKey = computed(() => ['weekly-claims', teamStore.currentTeam?.id, 'signed'])

const {
  data: weeklyClaims,
  isLoading: isFetching,
  error
} = useTanstackQuery<WeeklyClaim[]>(
  'weeklyClaims',
  computed(() => `/weeklyClaim/?teamId=${teamStore.currentTeamId}&status=signed`),
  {
    queryKey: signedQueryKey.value,
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

const totalPendingAmount = computed(() => {
  if (!weeklyClaims.value || !Array.isArray(weeklyClaims.value)) return ''
  const total = weeklyClaims.value.reduce((sum: number, weeklyClaim: WeeklyClaim) => {
    const hours = getTotalHoursWorked(weeklyClaim.claims)
    const rate = getHoulyRateInUserCurrency(weeklyClaim.wage.ratePerHour)
    return sum + hours * rate
  }, 0)
  return formatCurrencyShort(total, currency.value.code)
})

watch(error, (err) => {
  if (err) {
    toastStore.addErrorToast('Failed to fetch monthly pending amount')
    log.error('Failed to fetch monthly pending amount', err)
  }
})
</script>
