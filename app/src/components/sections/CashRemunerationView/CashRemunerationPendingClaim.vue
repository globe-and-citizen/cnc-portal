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
        <span class="text-sm font-semibold" data-test="percentage-increase">+ 12.3% </span>
        <span class="text-xs font-medium text-[#637381]">than last week</span>
      </div>
    </div>
  </OverviewCard>
</template>

<script setup lang="ts">
import { sumFiatValues, valueTokenAmount } from '@/utils/currency/valuation'
import personIcon from '@/assets/person.svg'
import uptrendIcon from '@/assets/uptrend.svg'
import OverviewCard from '@/components/ui/OverviewCard.vue'
import { useCurrencyStore, useTeamStore } from '@/stores'
import { formatCurrencyShort } from '@/utils/currency/display'
import { log } from '@/lib/logging'
import { watch, computed } from 'vue'
import { useGetTeamWeeklyClaimsQuery } from '@/queries'
import { useStorage } from '@vueuse/core'
import type { TokenId } from '@/constant'
import type { RatePerHour, WeeklyClaim } from '@/types/cash-remuneration'

const teamStore = useTeamStore()
const toast = useToast()
const currencyStore = useCurrencyStore()

const currency = useStorage('currency', {
  code: 'USD',
  name: 'US Dollar',
  symbol: '$'
})

const {
  data: weeklyClaims,
  isLoading: isFetching,
  error
} = useGetTeamWeeklyClaimsQuery({
  queryParams: {
    teamId: computed(() => teamStore.currentTeamId),
    status: 'signed'
  }
})

function getHoulyRateInUserCurrency(
  ratePerHour: RatePerHour[],
  tokenStore = currencyStore
): number | null {
  return sumFiatValues(
    ratePerHour.map((rate) =>
      valueTokenAmount(
        rate.amount,
        tokenStore.getTokenInfo(rate.type as TokenId)?.prices.find((price) => price.id === 'local')
          ?.price
      )
    )
  )
}

const totalPendingAmount = computed(() => {
  const rows = weeklyClaims.value?.data
  if (!rows) return ''
  const total = sumFiatValues(
    rows.map((weeklyClaim: WeeklyClaim) =>
      valueTokenAmount(
        weeklyClaim.minutesWorked / 60,
        getHoulyRateInUserCurrency(weeklyClaim.wage.ratePerHour)
      )
    )
  )
  return formatCurrencyShort(total, currency.value.code)
})

watch(error, (err) => {
  if (err) {
    toast.add({ title: 'Failed to fetch monthly pending amount', color: 'error' })
    log.error('Failed to fetch monthly pending amount', err)
  }
})
</script>
