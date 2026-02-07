<template>
  <CardComponent title="Investor Actions">
    <div class="flex flex-col justify-around gap-2 w-full" data-test="investors-actions">
      <div class="flex flex-wrap items-end w-full justify-between">
        <div class="flex gap-x-1">
          <h4>Contract Address :</h4>
          <AddressToolTip :address="investorAddress" v-if="investorAddress" />
        </div>
        <div class="flex gap-2">
          <template v-if="isLoadingTokenSymbol || isLoadingInvestorsOwner || !tokenSymbol || !investorsOwner || !investorAddress">
            <div class="skeleton h-10 w-40" data-test="skeleton-1"></div>
            <div class="skeleton h-10 w-40" data-test="skeleton-2"></div>
            <div class="skeleton h-10 w-40" data-test="skeleton-3"></div>
          </template>
          <template v-else>
            <DistributeMintAction
              :token-symbol="tokenSymbol"
              :investors-address="investorAddress"
            />
            <MintTokenAction
              :token-symbol="tokenSymbol"
              :investors-owner="investorsOwner"
            />
            
            <PayDividendsAction
              :token-symbol="tokenSymbol"
              :shareholders-count="shareholders?.length ?? 0"
              :investors-address="investorAddress"
              :investors-owner="investorsOwner"
              :bank-address="bankAddress"
            />
          </template>
        </div>
      </div>
    </div>
  </CardComponent>
</template>

<script setup lang="ts">
import { watch } from 'vue'
// import type { Address } from 'viem'
import { INVESTOR_ABI } from '@/artifacts/abi/investorsV1'
// import { OFFICER_ABI } from '@/artifacts/abi/officer'
import { useReadContract } from '@wagmi/vue'
import { useTeamStore, useToastStore } from '@/stores'
import { log } from '@/utils'
import CardComponent from '@/components/CardComponent.vue'
import AddressToolTip from '@/components/AddressToolTip.vue'
import DistributeMintAction from './InvestorActions/DistributeMintAction.vue'
import MintTokenAction from './InvestorActions/MintTokenAction.vue'
import PayDividendsAction from './InvestorActions/PayDividendsAction.vue'

defineEmits<{
  refetchShareholders: []
}>()

const { addErrorToast } = useToastStore()
const teamStore = useTeamStore()

const investorAddress = teamStore.getContractAddressByType('InvestorV1')
const bankAddress = teamStore.getContractAddressByType('Bank')

// Get token symbol
const { data: tokenSymbol, error: tokenSymbolError, isLoading: isLoadingTokenSymbol } = useReadContract({
  abi: INVESTOR_ABI,
  address: investorAddress,
  functionName: 'symbol'
})

// Get shareholders list
const { data: shareholders, error: shareholderError } = useReadContract({
  abi: INVESTOR_ABI,
  address: investorAddress,
  functionName: 'getShareholders'
})

// Get investors contract owner
const {
  data: investorsOwner,
  error: errorInvestorsOwner,
  isLoading: isLoadingInvestorsOwner
} = useReadContract({
  functionName: 'owner',
  address: investorAddress,
  abi: INVESTOR_ABI
})

// Watch for errors and display toast notifications
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

watch(errorInvestorsOwner, (value) => {
  if (value) {
    log.error('Error fetching investors owner', value)
    addErrorToast('Error fetching investors owner')
  }
})
</script>
