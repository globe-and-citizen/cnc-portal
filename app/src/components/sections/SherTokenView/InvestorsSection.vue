<template>
  <div class="flex flex-col gap-y-8">
    <InvestorsHeader />
    <div class="divider m-0"></div>
    <InvestorsActions
      :token-symbol-loading="tokenSymbolLoading"
      :token-symbol="tokenSymbol"
      :team="teamStore.currentTeam!"
      @refetchShareholders="
        () => {
          refetchTokenBalance()
          refetchShareholders()
        }
      "
      :shareholders="shareholders"
    />
    <div class="divider m-0"></div>
    <ShareholderList />
  </div>
</template>

<script setup lang="ts">
import InvestorsHeader from '@/components/sections/SherTokenView/InvestorsHeader.vue'
import InvestorsActions from '@/components/sections/SherTokenView/InvestorsActions.vue'
import { useReadContract } from '@wagmi/vue'
import { type Address } from 'viem'
import { INVESTOR_ABI } from '@/artifacts/abi/investorsV1'
import ShareholderList from '@/components/sections/SherTokenView/ShareholderList.vue'
import { watch, computed } from 'vue'
import { log } from '@/utils'
import { useTeamStore, useToastStore, useUserDataStore } from '@/stores'

const { addErrorToast } = useToastStore()
const { address: currentAddress } = useUserDataStore()
const teamStore = useTeamStore()

const investorsAddress = computed(() => teamStore.getContractAddressByType('InvestorsV1'))

const {
  data: tokenSymbol,
  isLoading: tokenSymbolLoading,
  error: tokenSymbolError
} = useReadContract({
  abi: INVESTOR_ABI,
  address: investorsAddress,
  functionName: 'symbol'
})

const {
  data: shareholders,
  error: shareholderError,
  refetch: refetchShareholders
} = useReadContract({
  abi: INVESTOR_ABI,
  address: investorsAddress,
  functionName: 'getShareholders'
})

const { error: tokenBalanceError, refetch: refetchTokenBalance } = useReadContract({
  abi: INVESTOR_ABI,
  address: investorsAddress,
  functionName: 'balanceOf',
  args: [currentAddress as Address]
})

watch(tokenBalanceError, () => {
  if (tokenBalanceError.value) {
    log.error('Failed to fetch token balance')
    addErrorToast('Failed to fetch token balance')
  }
})

watch(tokenSymbolError, (value) => {
  if (value) {
    log.error('Error fetching token symbol', value)
    addErrorToast('Error fetching token symbol')
  }
})
watch(shareholderError, (value) => {
  if (value) {
    log.error('Error fetching shareholders', value)
    addErrorToast('Error fetching shareholders')
  }
})
</script>
