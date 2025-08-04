<template>
  <div class="flex gap-10">
    <InvestorsNumber v-bind="props" />
    <InvestorsBalance v-bind="props" />
    <TotalSupply v-bind="props" />
  </div>
</template>

<script setup lang="ts">
import TotalSupply from '@/components/sections/SherTokenView/TotalSupply.vue'
import InvestorsBalance from '@/components/sections/SherTokenView/InvestorsBalance.vue'
import InvestorsNumber from '@/components/sections/SherTokenView/InvestorsNumber.vue'
import { defineProps } from 'vue'
import type { Team } from '@/types'

const props = defineProps<{
  team: Team
  tokenSymbol: string | undefined
  totalSupply: bigint | undefined
  tokenSymbolLoading: boolean
  totalSupplyLoading: boolean
  tokenBalance: bigint | undefined
  loadingTokenBalance: boolean
  investorsCount: number
}>()
</script>
