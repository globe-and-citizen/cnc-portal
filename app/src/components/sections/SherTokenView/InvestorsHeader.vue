<template>
  <CardComponent title="Token Information">
    <div class="flex justify-between">
      <div class="flex flex-col text-right">
        <h2>Balance</h2>
        <p v-if="!loadingTokenBalance && !tokenSymbolLoading" data-test="token-balance">
          <span class="text-3xl">{{ formatUnits(tokenBalance!, 6) }}</span>
          {{ tokenSymbol }}
        </p>
        <span
          v-if="loadingTokenBalance && tokenSymbolLoading"
          class="loading loading-dots loading-sm self-end"
          data-test="token-balance-loading"
        ></span>
      </div>
      <div class="flex flex-col text-right gap-y-4">
        <h3>Total Supply</h3>
        <p v-if="!tokenSymbolLoading && !totalSupplyLoading" data-test="total-supply">
          <span class="text-3xl">{{ formatUnits(totalSupply!, 6) }}</span>
          {{ tokenSymbol }}
        </p>
        <span
          v-if="tokenSymbolLoading && totalSupplyLoading"
          class="loading loading-dots loading-sm self-end"
          data-test="total-supply-loading"
        ></span>
      </div>
    </div>
  </CardComponent>
</template>

<script setup lang="ts">
import type { Team } from '@/types'
import { formatUnits } from 'viem'
import CardComponent from '@/components/CardComponent.vue'

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
