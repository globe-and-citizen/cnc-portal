<template>
  <OverviewCard :title="total[currency.code]?.formated ?? 0" variant="success" subtitle="Total Balance"
    :card-icon="bagIcon" :loading="isLoadingBalance">
    <div class="flex flex-row gap-1 text-black">
      <img :src="uptrendIcon" alt="status-icon" />
      <div>
        <span class="font-semibold text-sm" data-test="percentage-increase">+ 41.3% </span>
        <span class="font-medium text-[#637381] text-xs">than last week</span>
      </div>
    </div>
  </OverviewCard>
</template>
<script lang="ts" setup>
import bagIcon from '@/assets/bag.svg'
import uptrendIcon from '@/assets/uptrend.svg'
import OverviewCard from '@/components/OverviewCard.vue'
import { useContractBalance } from '@/composables/useContractBalance'
import { useTeamStore } from '@/stores'
import { useStorage } from '@vueuse/core'
import type { Address } from 'viem'

const currency = useStorage('currency', {
  code: 'USD',
  name: 'US Dollar',
  symbol: '$'
})
const teamStore = useTeamStore()

const contractAddress = teamStore.getContractAddressByType('CashRemunerationEIP712')
const { isLoading: isLoadingBalance, total } = useContractBalance(contractAddress as Address)
</script>
