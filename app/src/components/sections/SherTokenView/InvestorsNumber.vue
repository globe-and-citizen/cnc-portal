<template>
  <OverviewCard
    :title="`${investorsCount} Investors`"
    subtitle="Investors"
    variant="info"
    :card-icon="personIcon"
    :loading="!team.name"
  >
  </OverviewCard>
</template>
<script setup lang="ts">
import OverviewCard from '@/components/OverviewCard.vue'
import personIcon from '@/assets/person.svg'

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
