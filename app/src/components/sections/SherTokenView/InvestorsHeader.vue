<template>
  <div class="flex gap-10">
    <OverviewCard
      :title="`${shareholders?.length || 0} Investors`"
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
import { formatUnits, type Address } from 'viem'
import OverviewCard from '@/components/OverviewCard.vue'
import cartIcon from '@/assets/cart.svg'
import bagIcon from '@/assets/bag.svg'
import personIcon from '@/assets/person.svg'
import { useTeamStore, useToastStore, useUserDataStore } from '@/stores'
import { useReadContract } from '@wagmi/vue'
import { INVESTOR_ABI } from '@/artifacts/abi/investorsV1'
import { computed, watch } from 'vue'
import { log } from '@/utils'

const teamStore = useTeamStore()
const { addErrorToast } = useToastStore()
const userStore = useUserDataStore()

const investorsAddress = computed(() => teamStore.getContractAddressByType('InvestorV1'))

const { data: tokenSymbol, error: tokenSymbolError } = useReadContract({
  abi: INVESTOR_ABI,
  address: investorsAddress,
  functionName: 'symbol'
})

const { data: totalSupply, error: totalSupplyError } = useReadContract({
  abi: INVESTOR_ABI,
  address: investorsAddress,
  functionName: 'totalSupply'
})

const { data: tokenBalance, error: tokenBalanceError } = useReadContract({
  abi: INVESTOR_ABI,
  address: investorsAddress,
  functionName: 'balanceOf',
  args: [userStore.address as Address]
})

const { data: shareholders, error: shareholderError } = useReadContract({
  abi: INVESTOR_ABI,
  address: investorsAddress,
  functionName: 'getShareholders'
})

watch(tokenSymbolError, (value) => {
  if (value) {
    log.error('Error fetching token symbol', value)
    addErrorToast('Error fetching token symbol')
  }
})

watch(totalSupplyError, (value) => {
  if (value) {
    log.error('Error fetching total supply', value)
    addErrorToast('Error fetching total supply')
  }
})

watch(tokenBalanceError, () => {
  if (tokenBalanceError.value) {
    log.error('Failed to fetch token balance')
    addErrorToast('Failed to fetch token balance')
  }
})

watch(shareholderError, (value) => {
  if (value) {
    log.error('Error fetching shareholders', value)
    addErrorToast('Error fetching shareholders')
  }
})
</script>
