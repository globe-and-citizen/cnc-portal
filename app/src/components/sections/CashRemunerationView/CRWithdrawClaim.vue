<template>
  <a
    v-if="isDropDown"
    data-test="withdraw-action"
    :class="['text-sm', { disabled: withdrawTx.isPending.value }]"
    :aria-disabled="withdrawTx.isPending.value"
    :tabindex="withdrawTx.isPending.value ? -1 : 0"
    :style="{ pointerEvents: withdrawTx.isPending.value ? 'none' : undefined }"
    @click="
      async () => {
        if (withdrawTx.isPending.value) return
        if (!isClaimOwner) {
          emit('claim-withdrawn')
          return
        }
        await withdrawClaim()
        emit('claim-withdrawn')
      }
    "
  >
    <span v-if="withdrawTx.isPending.value" class="loading loading-spinner loading-xs mr-2"></span>
    Withdraw
  </a>
  <UButton
    v-else
    :disabled="disabled"
    :loading="withdrawTx.isPending.value"
    color="warning"
    data-test="withdraw-button"
    size="sm"
    @click="async () => await withdrawClaim()"
    label="Withdraw"
  />
</template>

<script setup lang="ts">
import { useTeamStore } from '@/stores'
import { buildClaimRatesWithOvertime, classifyError, log } from '@/utils'
import { zeroAddress, type Address } from 'viem'
import { computed } from 'vue'
import { CASH_REMUNERATION_EIP712_ABI } from '@/artifacts/abi/cash-remuneration-eip712'
import { USDC_ADDRESS } from '@/constant'
import type { WeeklyClaim } from '@/types'
import { useSyncWeeklyClaimsMutation } from '@/queries'
import { useContractWritesV3 } from '@/composables/contracts/useContractWritesV3'

const props = defineProps<{
  weeklyClaim: WeeklyClaim
  disabled?: boolean
  isDropDown?: boolean
  isClaimOwner?: boolean
}>()

const emit = defineEmits(['claim-withdrawn'])

const teamStore = useTeamStore()
const toast = useToast()

const cashRemunerationEip712Address = computed(() =>
  teamStore.getContractAddressByType('CashRemunerationEIP712')
)
const withdrawTx = useContractWritesV3({
  contractAddress: cashRemunerationEip712Address,
  abi: CASH_REMUNERATION_EIP712_ABI,
  functionName: 'withdraw'
})

const { mutateAsync: syncWeeklyClaim, error: syncWeeklyClaimError } = useSyncWeeklyClaimsMutation()

const getTokenAddress = (type: string): Address => {
  if (type === 'native') return zeroAddress as Address
  if (type === 'usdc') return USDC_ADDRESS as Address
  return teamStore.getContractAddressByType('InvestorV1') as Address
}

const withdrawClaim = async () => {
  if (withdrawTx.isPending.value) return

  if (!cashRemunerationEip712Address.value) {
    toast.add({ title: 'Cash Remuneration EIP712 contract address not found', color: 'error' })
    return
  }

  const claimRates = buildClaimRatesWithOvertime({
    hoursWorked: props.weeklyClaim.hoursWorked,
    maximumHoursPerWeek: props.weeklyClaim.wage.maximumHoursPerWeek,
    ratePerHour: props.weeklyClaim.wage.ratePerHour,
    overtimeRatePerHour: props.weeklyClaim.wage.overtimeRatePerHour
  })

  const claimData = {
    hoursWorked: props.weeklyClaim.hoursWorked,
    employeeAddress: props.weeklyClaim.wage.userAddress as Address,
    date: BigInt(Math.floor(new Date(props.weeklyClaim.createdAt).getTime() / 1000)),
    wages: claimRates.map((rate) => ({
      hourlyRate: rate.hourlyRate,
      tokenAddress: getTokenAddress(rate.type)
    }))
  }

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
