<template>
  <a
    v-if="isDropDown"
    data-test="withdraw-action"
    :class="['text-sm', { disabled: isLoad }]"
    :aria-disabled="isLoad"
    :tabindex="isLoad ? -1 : 0"
    :style="{ pointerEvents: isLoad ? 'none' : undefined }"
    @click="
      async () => {
        if (isLoad) return
        if (!isClaimOwner) {
          emit('claim-withdrawn')
          return
        }
        await withdrawClaim()
        emit('claim-withdrawn')
      }
    "
  >
    <span v-if="isLoad" class="loading loading-spinner loading-xs mr-2"></span>
    Withdraw
  </a>
  <UButton
    v-else
    :disabled="disabled"
    :loading="isLoad"
    color="warning"
    data-test="withdraw-button"
    size="sm"
    @click="async () => await withdrawClaim()"
    label="Withdraw"
  />
</template>

<script setup lang="ts">
import { useTeamStore } from '@/stores'
import { buildClaimRatesWithOvertime, log, parseError } from '@/utils'
import { zeroAddress, type Address } from 'viem'
import { computed, ref } from 'vue'
import { CASH_REMUNERATION_EIP712_ABI } from '@/artifacts/abi/cash-remuneration-eip712'
import { getBalance } from 'viem/actions'
import { config } from '@/wagmi.config'
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

// const weeklyClaimUrl = computed(() => `/weeklyclaim/${props.weeklyClaim.id}/?action=withdraw`)

const { mutateAsync: syncWeeklyClaim, error: syncWeeklyClaimError } = useSyncWeeklyClaimsMutation()

const isLoading = ref(false)
const isLoad = computed(() => isLoading.value as boolean)

const getTokenAddress = (type: string): Address => {
  if (type === 'native') return zeroAddress as Address
  if (type === 'usdc') return USDC_ADDRESS as Address
  return teamStore.getContractAddressByType('InvestorV1') as Address
}

const withdrawClaim = async () => {
  isLoading.value = true

  if (!cashRemunerationEip712Address.value) {
    isLoading.value = false
    toast.add({ title: 'Cash Remuneration EIP712 contract address not found', color: 'error' })
    return
  }

  const claimRates = buildClaimRatesWithOvertime({
    hoursWorked: props.weeklyClaim.hoursWorked,
    maximumHoursPerWeek: props.weeklyClaim.wage.maximumHoursPerWeek,
    ratePerHour: props.weeklyClaim.wage.ratePerHour,
    overtimeRatePerHour: props.weeklyClaim.wage.overtimeRatePerHour
  })

  // balance check
  const balance = await getBalance(config.getClient(), {
    address: cashRemunerationEip712Address.value
  })
  const nativeAmountToPay = claimRates.find((rate) => rate.type === 'native')?.totalAmount ?? 0n

  if (balance < nativeAmountToPay) {
    isLoading.value = false
    toast.add({ title: 'Insufficient balance', color: 'error' })
    return
  }

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
        isLoading.value = false
      },
      onError: (error) => {
        isLoading.value = false
        log.error('Withdraw error', error)
        const parsed = parseError(error, CASH_REMUNERATION_EIP712_ABI)

        if (parsed.includes('Insufficient token balance')) {
          toast.add({ title: 'Insufficient token balance', color: 'error' })
        } else if (
          parsed.includes('Token not supported') ||
          parsed.includes('Token not support') ||
          parsed.includes('unsupported token')
        ) {
          toast.add({ title: 'Add Token support: Token not supported', color: 'error' })
        } else {
          toast.add({ title: parsed, color: 'error' })
        }
      }
    }
  )
}
</script>
