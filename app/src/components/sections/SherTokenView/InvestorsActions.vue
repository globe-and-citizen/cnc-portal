<template>
  <UCard>
    <template #header>Investor Actions</template>
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
              !safeTokenSymbol ||
              !safeInvestorsOwner ||
              !investorAddress
            "
          >
            <div class="skeleton h-10 w-40" data-test="skeleton-1"></div>
            <div class="skeleton h-10 w-40" data-test="skeleton-2"></div>
            <div class="skeleton h-10 w-40" data-test="skeleton-3"></div>
          </template>
          <template v-else>
            <DistributeMintAction
              :token-symbol="safeTokenSymbol"
              :investors-address="investorAddress"
            />
            <MintTokenAction
              :token-symbol="safeTokenSymbol"
              :investors-owner="safeInvestorsOwner"
            />

            <PayDividendsAction
              :token-symbol="safeTokenSymbol"
              :shareholders-count="safeShareholders.length"
              :investors-address="investorAddress"
              :investors-owner="safeInvestorsOwner"
              :bank-address="bankAddress"
            />
            <ToggleSherCompensationButton />
            <SetCompensationMultiplierButton />
            <InvestInSafeButton />
          </template>
        </div>
      </div>
    </div>
  </UCard>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { useTeamStore } from '@/stores'
import { log } from '@/utils'
import AddressToolTip from '@/components/AddressToolTip.vue'
import DistributeMintAction from './InvestorActions/DistributeMintAction.vue'
import MintTokenAction from './InvestorActions/MintTokenAction.vue'
import PayDividendsAction from './InvestorActions/PayDividendsAction.vue'
import ToggleSherCompensationButton from './InvestorActions/ToggleSherCompensationButton.vue'
import SetCompensationMultiplierButton from './InvestorActions/SetCompensationMultiplierButton.vue'
import InvestInSafeButton from './InvestorActions/InvestInSafeButton.vue'
import {
  useInvestorSymbol,
  useInvestorShareholders,
  useInvestorOwner
} from '@/composables/investor/reads'

defineEmits<{
  refetchShareholders: []
}>()

const toast = useToast()
const teamStore = useTeamStore()

const investorAddress = teamStore.getContractAddressByType('InvestorV1')
const bankAddress = teamStore.getContractAddressByType('Bank')

// Get token symbol
const {
  data: tokenSymbol,
  error: tokenSymbolError,
  isLoading: isLoadingTokenSymbol
} = useInvestorSymbol()
const safeTokenSymbol = computed(() =>
  typeof tokenSymbol.value === 'string' ? tokenSymbol.value : ''
)

// Get shareholders list
const { data: shareholders, error: shareholderError } = useInvestorShareholders()
const safeShareholders = computed(() =>
  Array.isArray(shareholders.value) ? shareholders.value : ([] as string[])
)

// Get investors contract owner
const {
  data: investorsOwner,
  error: errorInvestorsOwner,
  isLoading: isLoadingInvestorsOwner
} = useInvestorOwner()
const safeInvestorsOwner = computed(() =>
  typeof investorsOwner.value === 'string' ? investorsOwner.value : ''
)

// Watch for errors and display toast notifications
watch(tokenSymbolError, (value) => {
  if (value) {
    log.error('Error fetching token symbol', value)
    toast.add({ title: 'Error fetching token symbol', color: 'error' })
  }
})

watch(shareholderError, (value) => {
  if (value) {
    log.error('Error fetching shareholders', value)
    toast.add({ title: 'Error fetching shareholders', color: 'error' })
  }
})

watch(errorInvestorsOwner, (value) => {
  if (value) {
    log.error('Error fetching investors owner', value)
    toast.add({ title: 'Error fetching investors owner', color: 'error' })
  }
})
</script>
