<template>
  <a
    data-test="enable-action"
    @click="
      async () => {
        await enableClaim()
        $emit('close')
      }
    "
    class="text-sm"
  >
    Enable
  </a>
</template>
<script lang="ts" setup>
import { CASH_REMUNERATION_EIP712_ABI } from '@/artifacts/abi/cash-remuneration-eip712'
import { simulateContract, waitForTransactionReceipt, writeContract } from '@wagmi/core'
import { config } from '@/wagmi.config'
import { useCustomFetch } from '@/composables'
import { keccak256, type Address } from 'viem'
import { log, parseError } from '@/utils'
import { useQueryClient } from '@tanstack/vue-query'
import { useTeamStore, useToastStore } from '@/stores'
import { computed, ref } from 'vue'
import type { WeeklyClaim } from '@/types'

const props = defineProps<{
  isCashRemunerationOwner: boolean
  weeklyClaim: WeeklyClaim
}>()
defineEmits(['close'])

const teamStore = useTeamStore()
const toastStore = useToastStore()
const queryClient = useQueryClient()

const cashRemunerationAddress = computed(() =>
  teamStore.getContractAddressByType('CashRemunerationEIP712')
)

const claimAction = ref<'enable' | null>(null)

const weeklyClaimUrl = computed(
  () => `/weeklyclaim/${props.weeklyClaim.id}/?action=${claimAction.value}`
)

const { execute: updateClaimStatus, error: updateClaimError } = useCustomFetch(weeklyClaimUrl, {
  immediate: false
})
  .put()
  .json()

const isLoading = ref(false)

// Methods
const enableClaim = async () => {
  if (!props.isCashRemunerationOwner) return

  isLoading.value = true
  if (!cashRemunerationAddress.value) {
    isLoading.value = false
    toastStore.addErrorToast('Cash Remuneration EIP712 contract address not found')
    return
  }
  // disable
  try {
    const args = {
      abi: CASH_REMUNERATION_EIP712_ABI,
      functionName: 'enableClaim' as const,
      args: [keccak256(props.weeklyClaim.signature as Address)] as const
    }
    await simulateContract(config, {
      ...args,
      address: cashRemunerationAddress.value
    })

    const hash = await writeContract(config, {
      ...args,
      address: cashRemunerationAddress.value
    })

    // Wait for transaction receipt
    const receipt = await waitForTransactionReceipt(config, {
      hash
    })

    if (receipt.status === 'success') {
      toastStore.addSuccessToast('Claim enabled')

      claimAction.value = 'enable'

      await updateClaimStatus()

      if (updateClaimError.value) {
        toastStore.addErrorToast('Failed to update Claim status')
      }
      queryClient.invalidateQueries({
        queryKey: ['weekly-claims', teamStore.currentTeam?.id]
      })
    } else {
      toastStore.addErrorToast('Transaction failed: Failed to enable claim')
    }

    isLoading.value = false
  } catch (error) {
    console.log('error: ', error)
    isLoading.value = false
    log.error('Enable error', error)
    const parsed = parseError(error, CASH_REMUNERATION_EIP712_ABI)

    toastStore.addErrorToast(parsed)
  }
}
</script>
