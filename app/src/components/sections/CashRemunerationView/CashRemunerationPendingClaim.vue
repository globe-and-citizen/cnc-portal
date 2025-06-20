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
import { useCustomFetch } from '@/composables'
import type { ClaimResponse } from '@/types'
import { useStorage } from '@vueuse/core'

const teamStore = useTeamStore()
const toastStore = useToastStore()
const currencyStore = useCurrencyStore()

const currency = useStorage('currency', {
  code: 'USD',
  name: 'US Dollar',
  symbol: '$'
})

const { data, isFetching, error } = useCustomFetch(
  `/claim?teamId=${teamStore.currentTeamId}&status=signed`
)
  .get()
  .json<ClaimResponse[]>()

const totalPendingAmount = computed(() => {
  const totalAmount = data.value?.reduce((acc, claim) => {
    return acc + (claim.hoursWorked || 0) * (claim.wage.cashRatePerHour || 0)
  }, 0)

  const nativeTokenInfo = currencyStore.getTokenInfo('native')
  return formatCurrencyShort(
    (totalAmount || 0) * (nativeTokenInfo?.prices.find((p) => p.id == 'local')?.price || 0),
    currency.value.code
  )
})

watch(error, (err) => {
  if (err) {
    toastStore.addErrorToast('Failed to fetch monthly pending amount')
    log.error('Failed to fetch monthly pending amount', err)
  }
})
</script>
