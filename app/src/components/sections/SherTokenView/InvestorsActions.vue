<template>
  <UCard>
    <template #header>
      <div class="mt-6 flex items-center justify-between">
        <h3 class="text-lg font-medium text-neutral-900 dark:text-white">Investor actions</h3>
        <div class="flex items-center gap-2">
          <span class="">Contract Address :</span>
          <AddressToolTip :address="investorAddress" v-if="investorAddress" />
        </div>
      </div>
    </template>

    <template
      v-if="
        isLoadingTokenSymbol ||
        isLoadingInvestorsOwner ||
        !safeTokenSymbol ||
        !safeInvestorsOwner ||
        !investorAddress
      "
    >
      <div class="grid grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-6">
        <div
          v-for="i in 6"
          :key="i"
          class="skeleton h-20 rounded-lg"
          :data-test="`skeleton-${i}`"
        />
      </div>
    </template>
    <template v-else>
      <div
        class="grid grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-6"
        data-test="investors-actions"
      >
        <DistributeMintAction
          :token-symbol="safeTokenSymbol"
          :investors-address="investorAddress"
        />
        <MintTokenAction :token-symbol="safeTokenSymbol" :investors-owner="safeInvestorsOwner" />
        <PayDividendsAction
          :token-symbol="safeTokenSymbol"
          :shareholders-count="safeShareholders.length"
          :investors-address="investorAddress"
          :bank-address="bankAddress"
        />
        <ToggleSherCompensationAction />
        <SetCompensationMultiplierAction />
        <InvestInSafeAction />
      </div>
    </template>
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
import ToggleSherCompensationAction from './InvestorActions/ToggleSherCompensationAction.vue'
import SetCompensationMultiplierAction from './InvestorActions/SetCompensationMultiplierAction.vue'
import InvestInSafeAction from './InvestorActions/InvestInSafeAction.vue'
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

const {
  data: tokenSymbol,
  error: tokenSymbolError,
  isLoading: isLoadingTokenSymbol
} = useInvestorSymbol()

const safeTokenSymbol = computed(() =>
  typeof tokenSymbol.value === 'string' ? tokenSymbol.value : ''
)

const { data: shareholders, error: shareholderError } = useInvestorShareholders()
const safeShareholders = computed(() =>
  Array.isArray(shareholders.value) ? shareholders.value : ([] as string[])
)

const {
  data: investorsOwner,
  error: errorInvestorsOwner,
  isLoading: isLoadingInvestorsOwner
} = useInvestorOwner()

const safeInvestorsOwner = computed(() =>
  typeof investorsOwner.value === 'string' ? investorsOwner.value : ''
)

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
