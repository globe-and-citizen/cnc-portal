<template>
  <div class="flex flex-col gap-6">
    <CashRemunerationOverview />

    <div class="flex flex-col sm:flex-row justify-end items-start sm:items-center gap-4">
      <div class="flex flex-wrap gap-2 sm:gap-4">
        <span class="text-sm">Contract Address </span>

        <AddressToolTip
          v-if="cashRemunerationAddress"
          :address="cashRemunerationAddress"
          class="text-sm font-bold"
        />
      </div>
    </div>
    <GenericTokenHoldingsSection
      v-if="cashRemunerationAddress"
      :address="cashRemunerationAddress"
    />

    <!-- Affiche le tableau CashRemunerationTable pour un membre individuel -->
    <!-- <CashRemunerationTable v-if="memberAddress" /> -->
    <ClaimHistory v-if="memberAddress" />
    <!-- Sinon, vue classique -->
    <template v-else>
      <PendingWeeklyClaim v-if="isCashRemunerationOwner" />
      <SignedWeeklyClaim />
    </template>
    <!-- <CashRemunerationTransactions /> -->
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { useTeamStore, useUserDataStore } from '@/stores'
import AddressToolTip from '@/components/AddressToolTip.vue'
import { useReadContract } from '@wagmi/vue'
import CashRemuneration_ABI from '@/artifacts/abi/CashRemunerationEIP712.json'

// import CashRemunerationTransactions from '@/components/sections/CashRemunerationView/CashRemunerationTransactions.vue'
// import CashRemunerationTable from '@/components/sections/CashRemunerationView/CashRemunerationTable.vue'
import GenericTokenHoldingsSection from '@/components/GenericTokenHoldingsSection.vue'
import CashRemunerationOverview from '@/components/sections/CashRemunerationView/CashRemunerationOverview.vue'
import PendingWeeklyClaim from '@/components/sections/CashRemunerationView/PendingWeeklyClaim.vue'
import SignedWeeklyClaim from '@/components/sections/CashRemunerationView/SignedWeeklyClaim.vue'
import { useRoute } from 'vue-router'
import ClaimHistory from '@/components/sections/ClaimHistoryView/ClaimHistory.vue'

const userStore = useUserDataStore()
const teamStore = useTeamStore()

const route = useRoute()
const memberAddress = route.params.memberAddress as string | undefined

const cashRemunerationAddress = computed(() =>
  teamStore.getContractAddressByType('CashRemunerationEIP712')
)

const { data: cashRemunerationOwner, error: cashRemunerationOwnerError } = useReadContract({
  functionName: 'owner',
  address: cashRemunerationAddress,
  abi: CashRemuneration_ABI
})

// Compute if user has approval access (is cash remuneration contract owner)
const isCashRemunerationOwner = computed(() => cashRemunerationOwner.value == userStore.address)

watch(
  () => cashRemunerationOwnerError.value,
  (error) => {
    if (error) {
      console.error('Error fetching cash remuneration owner:', error)
    }
  }
)
</script>
