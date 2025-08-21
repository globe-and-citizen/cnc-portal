<template>
  <div v-if="isCashRemunerationOwner">
    <div class="px-8 pb-4 flex items-end" :class="{ 'justify-between': isCashRemunerationOwner }">
      <span class="card-title" v-if="isCashRemunerationOwner">Pending Weekly Claim</span>
      <div class="card-actions justify-end">
        <CRAddERC20Support />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useCustomFetch } from '@/composables/useCustomFetch'
import { computed, watch } from 'vue'
import { useUserDataStore, useTeamStore, useToastStore } from '@/stores'
import { type WageResponse } from '@/types'
import { useReadContract } from '@wagmi/vue'
import CashRemuneration_ABI from '@/artifacts/abi/CashRemunerationEIP712.json'

import CRAddERC20Support from './CRAddERC20Support.vue'

const userStore = useUserDataStore()
const teamStore = useTeamStore()
const toastStore = useToastStore()

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

const { error: teamWageDataError } = useCustomFetch(
  computed(() => `/wage/?teamId=${teamStore.currentTeam?.id}`)
)
  .get()
  .json<Array<WageResponse>>()

watch(teamWageDataError, (newVal) => {
  if (newVal) {
    toastStore.addErrorToast('Failed to fetch user wage data')
  }
})

watch(cashRemunerationOwnerError, (value) => {
  if (value) {
    console.log('Failed to fetch cash remuneration owner:', value)
    toastStore.addErrorToast('Failed to fetch cash remuneration owner')
  }
})
</script>
