<template>
  <div v-if="isCashRemunerationOwner">
    <div class="px-8 pb-4 flex items-end" :class="{ 'justify-between': isCashRemunerationOwner }">
      <span class="card-title"></span>
      <div class="card-actions justify-end">
        <CRAddERC20Support />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { useUserDataStore, useTeamStore } from '@/stores'
import { useReadContract } from '@wagmi/vue'
import { CASH_REMUNERATION_EIP712_ABI } from '@/artifacts/abi/cash-remuneration-eip712'

import CRAddERC20Support from './CRAddERC20Support.vue'

const userStore = useUserDataStore()
const teamStore = useTeamStore()
const toast = useToast()

const cashRemunerationAddress = computed(() =>
  teamStore.getContractAddressByType('CashRemunerationEIP712')
)

const { data: cashRemunerationOwner, error: cashRemunerationOwnerError } = useReadContract({
  functionName: 'owner',
  address: cashRemunerationAddress,
  abi: CASH_REMUNERATION_EIP712_ABI
})

// Compute if user has approval access (is cash remuneration contract owner)
const isCashRemunerationOwner = computed(() => cashRemunerationOwner.value == userStore.address)

watch(cashRemunerationOwnerError, (value) => {
  if (value) {
    console.log('Failed to fetch cash remuneration owner:', value)
    toast.add({ title: 'Failed to fetch cash remuneration owner', color: 'error' })
  }
})
</script>
