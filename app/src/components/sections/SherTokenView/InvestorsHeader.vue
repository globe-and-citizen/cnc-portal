<template>
  <CardComponent title="Token Information">
    <div class="flex justify-between">
      <div class="flex flex-col text-right">
        <h2>Balance</h2>
        <p v-if="!loadingTokenBalance && !tokenSymbolLoading" data-test="token-balance">
          <span class="text-3xl">{{ formatEther(tokenBalance!) }}</span>
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
          <span class="text-3xl">{{ formatEther(totalSupply!) }}</span>
          {{ tokenSymbol }}
        </p>
        <span
          v-if="tokenSymbolLoading && totalSupplyLoading"
          class="loading loading-dots loading-sm self-end"
          data-test="total-supply-loading"
        ></span>
        <div class="flex gap-x-1">
          <h4>Contract Address :</h4>
          <AddressToolTip
            :address="
              team.teamContracts?.find((contract) => contract.type === 'InvestorsV1')?.address!
            "
          />
        </div>
      </div>
    </div>
  </CardComponent>
</template>

<script setup lang="ts">
import type { Team } from '@/types'
import { formatEther } from 'viem'
import AddressToolTip from '@/components/AddressToolTip.vue'
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
