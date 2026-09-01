<template>
  <OverviewCard
    :title="balance?.total.local.formatted ?? 0"
    variant="success"
    subtitle="Total Balance"
    :card-icon="bagIcon"
    :loading="isLoadingBalance"
  >
    <div class="flex flex-row gap-1 text-black">
      <img :src="uptrendIcon" alt="status-icon" />
      <div>
        <span class="text-sm font-semibold" data-test="percentage-increase">+ 41.3% </span>
        <span class="text-xs font-medium text-[#637381]">than last week</span>
      </div>
    </div>
  </OverviewCard>
</template>
<script lang="ts" setup>
import bagIcon from '@/assets/bag.svg'
import uptrendIcon from '@/assets/uptrend.svg'
import OverviewCard from '@/components/ui/OverviewCard.vue'
import { useContractBalance } from '@/composables/useContractBalance'
import { useTeamStore } from '@/stores'
import type { Address } from 'viem'

const teamStore = useTeamStore()

const contractAddress = teamStore.getContractAddressByType('CashRemunerationEIP712')
const { isLoading: isLoadingBalance, data: balance } = useContractBalance(
  contractAddress as Address
)
</script>
