<template>
  <div class="flex gap-10">
    <OverviewCard
      :title="`${shareholdersCount} Investors`"
      subtitle="Investors"
      color="info"
      :card-icon="personIcon"
      :loading="!teamStore.currentTeam"
    >
    </OverviewCard>
    <OverviewCard
      :title="
        tokenBalanceValue != null && tokenSymbolText
          ? formatUnits(tokenBalanceValue, 6) + ' ' + tokenSymbolText
          : '...'
      "
      subtitle="Your Balance"
      color="success"
      :card-icon="bagIcon"
      :loading="!teamStore.currentTeam"
    >
    </OverviewCard>
    <OverviewCard
      :title="
        totalSupplyValue != null && tokenSymbolText
          ? formatUnits(totalSupplyValue, 6) + ' ' + tokenSymbolText
          : '...'
      "
      subtitle="Total Supply"
      color="warning"
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
import { useTeamStore, useUserDataStore } from '@/stores'
import {
  useInvestorSymbol,
  useInvestorTotalSupply,
  useInvestorBalanceOf,
  useInvestorShareholders
} from '@/composables/investor/reads'
import { computed, watch } from 'vue'
import { log } from '@/utils'

const teamStore = useTeamStore()
const toast = useToast()
const userStore = useUserDataStore()

const { data: tokenSymbol, error: tokenSymbolError } = useInvestorSymbol()
const { data: totalSupply, error: totalSupplyError } = useInvestorTotalSupply()
const { data: tokenBalance, error: tokenBalanceError } = useInvestorBalanceOf(
  userStore.address as Address
)
const { data: shareholders, error: shareholderError } = useInvestorShareholders()

const tokenSymbolText = computed(() =>
  typeof tokenSymbol.value === 'string' ? tokenSymbol.value : ''
)

const tokenBalanceValue = computed(() =>
  typeof tokenBalance.value === 'bigint' ? tokenBalance.value : undefined
)

const totalSupplyValue = computed(() =>
  typeof totalSupply.value === 'bigint' ? totalSupply.value : undefined
)

const shareholdersCount = computed(() =>
  Array.isArray(shareholders.value) ? shareholders.value.length : 0
)

watch(tokenSymbolError, (value) => {
  if (value) {
    log.error('Error fetching token symbol', value)
    toast.add({ title: 'Error fetching token symbol', color: 'error' })
  }
})

watch(totalSupplyError, (value) => {
  if (value) {
    log.error('Error fetching total supply', value)
    toast.add({ title: 'Error fetching total supply', color: 'error' })
  }
})

watch(tokenBalanceError, () => {
  if (tokenBalanceError.value) {
    log.error('Failed to fetch token balance')
    toast.add({ title: 'Failed to fetch token balance', color: 'error' })
  }
})

watch(shareholderError, (value) => {
  if (value) {
    log.error('Error fetching shareholders', value)
    toast.add({ title: 'Error fetching shareholders', color: 'error' })
  }
})
</script>
