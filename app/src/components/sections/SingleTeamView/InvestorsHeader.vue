<template>
  <div class="flex justify-between">
    <div class="flex flex-col text-right">
      <h2>Balance</h2>
      <p v-if="!loadingTokenBalance && !tokenSymbolLoading">
        <span class="text-3xl">{{
          tokenBalance != undefined ? formatEther(tokenBalance) : '-'
        }}</span>
        {{ tokenSymbol }}
      </p>
      <span
        v-if="loadingTokenBalance && tokenSymbolLoading"
        class="loading loading-dots loading-sm self-end"
      ></span>
    </div>
    <div class="flex flex-col text-right gap-y-4">
      <h3>Total Supply</h3>
      <p v-if="!tokenSymbolLoading && !totalSupplyLoading">
        <span class="text-3xl">{{
          totalSupply != undefined ? formatEther(totalSupply) : '-'
        }}</span>
        {{ tokenSymbol }}
      </p>
      <span
        v-if="tokenSymbolLoading && totalSupplyLoading"
        class="loading loading-dots loading-sm self-end"
      ></span>
      <div class="flex gap-x-1">
        <h4>Contract Address :</h4>
        <AddressToolTip :address="team.investorsAddress ?? ''" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Team } from '@/types'
import { formatEther } from 'viem'
import AddressToolTip from '@/components/AddressToolTip.vue'

defineProps<{
  team: Team
  tokenSymbol: string | undefined
  totalSupply: bigint | undefined
  tokenSymbolLoading: boolean
  totalSupplyLoading: boolean
  tokenBalance: bigint | undefined
  loadingTokenBalance: boolean
}>()
</script>
