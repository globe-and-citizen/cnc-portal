<template>
  <OverviewCard
    :title="
      tokenBalance != null && tokenSymbol ? formatUnits(tokenBalance, 6) + ' ' + tokenSymbol : '...'
    "
    subtitle="Balance"
    variant="success"
    :card-icon="bagIcon"
    :loading="!team.name"
  >
  </OverviewCard>
</template>
<script setup lang="ts">
import OverviewCard from '@/components/OverviewCard.vue'
import bagIcon from '@/assets/bag.svg'
import type { Team } from '@/types'
import { formatUnits } from 'viem'

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
