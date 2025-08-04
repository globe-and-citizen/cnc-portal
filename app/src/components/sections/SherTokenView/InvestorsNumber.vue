<template>
  <OverviewCard
    :title="`${investorsCount} `"
    subtitle="Investors"
    variant="warning"
    :card-icon="bagIcon"
    :loading="!team.name"
  >
  </OverviewCard>
</template>
<script setup lang="ts">
import OverviewCard from '@/components/OverviewCard.vue'
import bagIcon from '@/assets/bag.svg'

const props = defineProps<{
  team: Partial<Team>
  tokenSymbol: string | undefined
  totalSupply: bigint | undefined
  tokenSymbolLoading: boolean
  totalSupplyLoading: boolean
  tokenBalance: bigint | undefined
  loadingTokenBalance: boolean
  investorsCount: number
}>()

const investorsCount = props.investorsCount
</script>
