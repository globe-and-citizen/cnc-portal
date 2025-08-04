<template>
  <OverviewCard
    :title="
      totalSupply != null && tokenSymbol ? formatUnits(totalSupply, 6) + ' ' + tokenSymbol : '...'
    "
    subtitle="Total Supply"
    variant="warning"
    :card-icon="bagIcon"
    :loading="!team.name"
  >
  </OverviewCard>
</template>
<script setup lang="ts">
import { formatUnits } from 'viem'
import OverviewCard from '@/components/OverviewCard.vue'
import bagIcon from '@/assets/bag.svg'
import type { Team } from '@/types'

defineProps<{
  team: Partial<Team>
  tokenSymbol: string | undefined
  totalSupply: bigint | undefined
  tokenSymbolLoading: boolean
  totalSupplyLoading: boolean
  tokenBalance: bigint | undefined
  loadingTokenBalance: boolean
}>()
</script>
