<template>
  <div class="flex gap-10">
    <OverviewCard
      :title="`${investorsCount} Investors`"
      subtitle="Investors"
      variant="info"
      :card-icon="personIcon"
      :loading="!teamStore.currentTeam"

    >
    </OverviewCard>
    <OverviewCard
      :title="
        tokenBalance != null && tokenSymbol
          ? formatUnits(tokenBalance, 6) + ' ' + tokenSymbol
          : '...'
      "
      subtitle="Balance"
      variant="success"
      :card-icon="bagIcon"
      :loading="!teamStore.currentTeam"
    >
    </OverviewCard>
    <OverviewCard
      :title="
        totalSupply != null && tokenSymbol ? formatUnits(totalSupply, 6) + ' ' + tokenSymbol : '...'
      "
      subtitle="Total Supply"
      variant="warning"
      :card-icon="cartIcon"
      :loading="!teamStore.currentTeam"
    >
    </OverviewCard>
  </div>
</template>

<script setup lang="ts">
import { formatUnits } from 'viem'
import OverviewCard from '@/components/OverviewCard.vue'
import cartIcon from '@/assets/cart.svg'
import bagIcon from '@/assets/bag.svg'
import personIcon from '@/assets/person.svg'
import { useTeamStore } from '@/stores'


const teamStore = useTeamStore()

defineProps<{
  tokenSymbol: string | undefined
  totalSupply: bigint | undefined
  tokenSymbolLoading: boolean
  totalSupplyLoading: boolean
  tokenBalance: bigint | undefined
  loadingTokenBalance: boolean
  investorsCount: number
}>()
</script>
