<template>
  <CardComponent title="Investor Actions">
    <div class="flex flex-col justify-around gap-2 w-full" data-test="investors-actions">
      <div class="flex flex-wrap items-end w-full justify-between">
        <div class="flex gap-x-1">
          <h4>Contract Address :</h4>
          <AddressToolTip :address="investorAddress" v-if="investorAddress" />
        </div>
        <div class="flex gap-2">
          <template
            v-if="
              isLoadingTokenSymbol ||
              isLoadingInvestorsOwner ||
              !tokenSymbolValue ||
              !investorsOwnerValue ||
              !investorAddress
            "
          >
            <div class="skeleton h-10 w-40" data-test="skeleton-1"></div>
            <div class="skeleton h-10 w-40" data-test="skeleton-2"></div>
            <div class="skeleton h-10 w-40" data-test="skeleton-3"></div>
          </template>
          <template v-else>
            <DistributeMintAction
              :token-symbol="tokenSymbolValue"
              :investors-address="investorAddress"
            />
            <MintTokenAction
              :token-symbol="tokenSymbolValue"
              :investors-owner="investorsOwnerValue"
            />

            <PayDividendsAction
              :token-symbol="tokenSymbolValue"
              :shareholders-count="shareholdersList.length"
              :investors-address="investorAddress"
              :investors-owner="investorsOwnerValue"
              :bank-address="bankAddress"
            />
            <ToggleSherCompensationButton />
            <InvestInSafeButton />
          </template>
        </div>
      </div>
    </div>
  </CardComponent>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import type { Address } from 'viem'
// import { OFFICER_ABI } from '@/artifacts/abi/officer'
import { useTeamStore, useToastStore } from '@/stores'
import { log } from '@/utils'
import CardComponent from '@/components/CardComponent.vue'
import AddressToolTip from '@/components/AddressToolTip.vue'
import DistributeMintAction from './InvestorActions/DistributeMintAction.vue'
import MintTokenAction from './InvestorActions/MintTokenAction.vue'
import PayDividendsAction from './InvestorActions/PayDividendsAction.vue'
import ToggleSherCompensationButton from './InvestorActions/ToggleSherCompensationButton.vue'
import InvestInSafeButton from './InvestorActions/InvestInSafeButton.vue'
import {
  useInvestorSymbol,
  useInvestorShareholders,
  useInvestorOwner
} from '@/composables/investor/reads'

defineEmits<{
  refetchShareholders: []
}>()

const { addErrorToast } = useToastStore()
const teamStore = useTeamStore()

const investorAddress = teamStore.getContractAddressByType('InvestorV1')
const bankAddress = teamStore.getContractAddressByType('Bank')

// Get token symbol
const {
  data: tokenSymbol,
  error: tokenSymbolError,
  isLoading: isLoadingTokenSymbol
} = useInvestorSymbol()

// Get shareholders list
const { data: shareholders, error: shareholderError } = useInvestorShareholders()

// Get investors contract owner
const {
  data: investorsOwner,
  error: errorInvestorsOwner,
  isLoading: isLoadingInvestorsOwner
} = useInvestorOwner()

const tokenSymbolValue = computed(() =>
  typeof tokenSymbol.value === 'string' ? tokenSymbol.value : ''
)

const investorsOwnerValue = computed<Address | undefined>(() => {
  if (typeof investorsOwner.value === 'string' && investorsOwner.value.startsWith('0x')) {
    return investorsOwner.value as Address
  }
  return undefined
})

const shareholdersList = computed(() =>
  Array.isArray(shareholders.value) ? shareholders.value : []
)

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
