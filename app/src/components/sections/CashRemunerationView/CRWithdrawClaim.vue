<template>
  <a
    v-if="isDropDown"
    data-test="withdraw-action"
    @click="
      async () => {
        if (!isClaimOwner) {
          emit('claim-withdrawn')
          return
        }
        await withdrawClaim()
        emit('claim-withdrawn')
      }
    "
    class="text-sm"
  >
    Withdraw
  </a>
  <ButtonUI
    v-else
    :disabled="disabled"
    :loading="isLoading"
    variant="warning"
    data-test="withdraw-button"
    size="sm"
    @click="async () => await withdrawClaim()"
    >Withdraw</ButtonUI
  >
</template>

<script setup lang="ts">
import { useTeamStore, useToastStore } from '@/stores'
import { log, parseError } from '@/utils'
import { useWriteContract } from '@wagmi/vue'
import { formatEther, parseEther, parseUnits, zeroAddress, type Address } from 'viem'
import { computed, ref } from 'vue'
import { CASH_REMUNERATION_EIP712_ABI } from '@/artifacts/abi/cash-remuneration-eip712'
import { getBalance } from 'viem/actions'
import { config } from '@/wagmi.config'
import { useCustomFetch } from '@/composables'
import ButtonUI from '@/components/ButtonUI.vue'
import { USDC_ADDRESS } from '@/constant'
import { simulateContract } from '@wagmi/core'
import { useQueryClient } from '@tanstack/vue-query'
import { waitForTransactionReceipt } from '@wagmi/core'
import type { WeeklyClaim } from '@/types'

const props = defineProps<{
  weeklyClaim: WeeklyClaim
  disabled?: boolean
  isDropDown?: boolean
  isClaimOwner?: boolean
}>()

const emit = defineEmits(['claim-withdrawn'])

const teamStore = useTeamStore()
const toastStore = useToastStore()
const queryClient = useQueryClient()

const cashRemunerationEip712Address = computed(() =>
  teamStore.getContractAddressByType('CashRemunerationEIP712')
)
const { writeContractAsync: withdraw } = useWriteContract()

const weeklyClaimUrl = computed(() => `/weeklyclaim/${props.weeklyClaim.id}/?action=withdraw`)

const { execute: updateClaimStatus, error: updateClaimError } = useCustomFetch(weeklyClaimUrl, {
  immediate: false
})
  .put()
  .json()

const isLoading = ref(false)

const withdrawClaim = async () => {
  isLoading.value = true

  if (!cashRemunerationEip712Address.value) {
    isLoading.value = false
    toastStore.addErrorToast('Cash Remuneration EIP712 contract address not found')
    return
  }
  // balance check
  const balance = formatEther(
    await getBalance(config.getClient(), {
      address: cashRemunerationEip712Address.value
    })
  )
  if (
    Number(balance) <
    Number(props.weeklyClaim.wage.ratePerHour.find((rate) => rate.type === 'native')?.amount || 0) *
      Number(props.weeklyClaim.hoursWorked)
  ) {
    isLoading.value = false
    toastStore.addErrorToast('Insufficient balance')
    return
  }

  const claimData = {
    hoursWorked: props.weeklyClaim.hoursWorked,
    employeeAddress: props.weeklyClaim.wage.userAddress as Address,
    date: BigInt(Math.floor(new Date(props.weeklyClaim.createdAt).getTime() / 1000)),
    wages: props.weeklyClaim.wage.ratePerHour.map((rate) => ({
      hourlyRate:
        rate.type === 'native' ? parseEther(`${rate.amount}`) : parseUnits(`${rate.amount}`, 6), // Convert to wei (assuming 6 decimals for USDC)
      tokenAddress:
        rate.type === 'native'
          ? (zeroAddress as Address)
          : rate.type === 'usdc'
            ? (USDC_ADDRESS as Address)
            : (teamStore.currentTeam?.teamContracts.find(
                (contract) => contract.type === 'InvestorV1'
              )?.address as Address)
    }))
  }

  // withdraw
  try {
    const args = {
      abi: CASH_REMUNERATION_EIP712_ABI,
      functionName: 'withdraw' as const,
      args: [claimData, props.weeklyClaim.signature as Address] as const
    }

    await simulateContract(config, {
      ...args,
      address: cashRemunerationEip712Address.value
    })

    const hash = await withdraw({
      ...args,
      address: cashRemunerationEip712Address.value
    })

    // Wait for transaction receipt
    const receipt = await waitForTransactionReceipt(config, {
      hash
    })

    if (receipt.status === 'success') {
      toastStore.addSuccessToast('Claim withdrawn')
      await updateClaimStatus()

      if (updateClaimError.value) {
        toastStore.addErrorToast('Failed to update Claim status')
      }
      queryClient.invalidateQueries({
        queryKey: ['weekly-claims', teamStore.currentTeam?.id]
      })

      emit('claim-withdrawn')
    } else {
      toastStore.addErrorToast('Transaction failed: Failed to withdraw claim')
    }

    isLoading.value = false
  } catch (error) {
    isLoading.value = false
    log.error('Withdraw error', error)
    const parsed = parseError(error, CASH_REMUNERATION_EIP712_ABI)

    if (parsed.includes('Insufficient token balance')) {
      toastStore.addErrorToast('Insufficient token balance')
    } else if (
      parsed.includes('Token not supported') ||
      parsed.includes('Token not support') ||
      parsed.includes('unsupported token')
    ) {
      toastStore.addErrorToast('Add Token support: Token not supported')
    } else {
      toastStore.addErrorToast(/*'Failed to withdraw'*/ parsed)
    }
  }
}
</script>
