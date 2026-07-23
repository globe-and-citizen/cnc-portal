<template>
  <a
    v-if="isDropDown"
    data-test="withdraw-action"
    :class="['text-sm', { disabled: withdrawTx.isPending.value || isTeamArchived }]"
    :aria-disabled="withdrawTx.isPending.value || isTeamArchived"
    :tabindex="withdrawTx.isPending.value || isTeamArchived ? -1 : 0"
    :style="{ pointerEvents: withdrawTx.isPending.value || isTeamArchived ? 'none' : undefined }"
    :title="isTeamArchived ? archivedTooltip : undefined"
    @click="
      async () => {
        if (withdrawTx.isPending.value || isTeamArchived) return
        if (!isClaimOwner) {
          emit('claim-withdrawn')
          return
        }
        await withdrawClaim()
        emit('claim-withdrawn')
      }
    "
  >
    <UIcon
      v-if="withdrawTx.isPending.value"
      name="i-lucide-loader-circle"
      class="mr-2 h-3 w-3 animate-spin"
    />
    Withdraw
  </a>
  <UTooltip v-else :text="archivedTooltip">
    <UButton
      :disabled="disabled || isTeamArchived"
      :loading="withdrawTx.isPending.value"
      color="warning"
      data-test="withdraw-button"
      size="sm"
      @click="async () => await withdrawClaim()"
      label="Withdraw"
    />
  </UTooltip>
</template>

<script setup lang="ts">
import { useTeamStore } from '@/stores'
import { buildWageClaimPayload, classifyError, log } from '@/utils'
import { zeroAddress, type Address } from 'viem'
import { USDC_ADDRESS } from '@/constant'
import type { WeeklyClaim } from '@/types'
import { useSyncWeeklyClaimsMutation } from '@/queries'
import { useWithdraw } from '@/composables/cashRemuneration/writes'
import { useTeamWriteGuard } from '@/composables/useTeamWriteGuard'

const props = defineProps<{
  weeklyClaim: WeeklyClaim
  disabled?: boolean
  isDropDown?: boolean
  isClaimOwner?: boolean
}>()

const emit = defineEmits(['claim-withdrawn'])

const teamStore = useTeamStore()
const toast = useToast()
const { isWriteDisabled: isTeamArchived, archivedTooltip } = useTeamWriteGuard()

const withdrawTx = useWithdraw()

const { mutateAsync: syncWeeklyClaim, error: syncWeeklyClaimError } = useSyncWeeklyClaimsMutation()

const getTokenAddress = (type: string): Address => {
  if (type === 'native') return zeroAddress as Address
  if (type === 'usdc') return USDC_ADDRESS as Address
  return teamStore.getInvestorAddress() as Address
}

const withdrawClaim = async () => {
  if (withdrawTx.isPending.value || isTeamArchived.value) return

  if (!teamStore.getContractAddressByType('CashRemunerationEIP712')) {
    toast.add({ title: 'Cash Remuneration EIP712 contract address not found', color: 'error' })
    return
  }

  const claimData = buildWageClaimPayload({ weeklyClaim: props.weeklyClaim, getTokenAddress })

  // withdraw
  withdrawTx.mutate(
    { args: [claimData, props.weeklyClaim.signature as `0x${string}`] },
    {
      onSuccess: async () => {
        toast.add({ title: 'Claim withdrawn', color: 'success' })

        if (teamStore.currentTeamId) {
          await syncWeeklyClaim({ queryParams: { teamId: teamStore.currentTeamId } })

          if (syncWeeklyClaimError.value) {
            toast.add({ title: 'Failed to update Claim status', color: 'error' })
          }
        }

        emit('claim-withdrawn')
      },
      onError: (error) => {
        log.error('Withdraw error', error)

        const classified = classifyError(error, { contract: 'CashRemuneration' })

        // Silent when user cancels from wallet — nothing to show.
        if (classified.category === 'user_rejected') return

        toast.add({
          title: classified.userMessage,
          color: 'error'
        })
      }
    }
  )
}
</script>
