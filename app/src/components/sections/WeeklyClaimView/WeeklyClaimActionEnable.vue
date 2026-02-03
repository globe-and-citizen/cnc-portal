<template>
  <a
    data-test="enable-action"
    :class="['text-sm', { disabled: isLoad }]"
    :aria-disabled="isLoad"
    :tabindex="isLoad ? -1 : 0"
    :style="{ pointerEvents: isLoad ? 'none' : undefined }"
    @click="
      async () => {
        if (isLoad) return
        await enableClaim()
        $emit('close')
      }
    "
  >
    <span v-if="isLoad" class="loading loading-spinner loading-xs mr-2"></span>
    Enable
  </a>
</template>
<script lang="ts" setup>
import { CASH_REMUNERATION_EIP712_ABI } from '@/artifacts/abi/cash-remuneration-eip712'
import { simulateContract, waitForTransactionReceipt, writeContract } from '@wagmi/core'
import { config } from '@/wagmi.config'
import { useSyncWeeklyClaimsMutation } from '@/queries/weeklyClaim.queries'
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
const emit = defineEmits(['close', 'loading'])

const teamStore = useTeamStore()
const toastStore = useToastStore()
const queryClient = useQueryClient()

const cashRemunerationAddress = computed(() =>
  teamStore.getContractAddressByType('CashRemunerationEIP712')
)

const claimAction = ref<'enable' | null>(null)

const { mutateAsync: syncWeeklyClaim } = useSyncWeeklyClaimsMutation()

const isLoading = ref(false)
const isLoad = computed(() => isLoading.value)

// Methods
const enableClaim = async () => {
  if (!props.isCashRemunerationOwner) return

  isLoading.value = true
  emit('loading', true)
  if (!cashRemunerationAddress.value) {
    isLoading.value = false
    emit('loading', false)
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

      try {
        await syncWeeklyClaim({ teamId: teamStore.currentTeamId! })
      } catch {
        toastStore.addErrorToast('Failed to update Claim status')
      }

      queryClient.invalidateQueries({
        queryKey: ['weekly-claims', teamStore.currentTeamId]
      })

      isLoading.value = false
      emit('loading', false)
    } else {
      toastStore.addErrorToast('Transaction failed: Failed to enable claim')
      // keep loading until explicit success
    }
  } catch (error) {
    console.log('error: ', error)
    // Stop loading on cancel or explicit error
    isLoading.value = false
    emit('loading', false)
    log.error('Enable error', error)
    const parsed = parseError(error, CASH_REMUNERATION_EIP712_ABI)

    toastStore.addErrorToast(parsed)
  }
}
</script>
