<template>
  <ButtonUI
    v-if="claim.status == 'signed'"
    :disabled="userDataStore.address !== claim.wage.userAddress"
    :loading="isLoading"
    variant="warning"
    data-test="withdraw-button"
    size="sm"
    @click="async () => await withdrawClaim()"
    >Withdraw</ButtonUI
  >
</template>

<script setup lang="ts">
import { useTeamStore, useToastStore, useUserDataStore } from '@/stores'
import type { CRSignClaim } from '@/types'
import { log, parseError } from '@/utils'
import { useWriteContract } from '@wagmi/vue'
import {
  encodeFunctionData,
  formatEther,
  parseEther,
  parseUnits,
  zeroAddress,
  type Address
} from 'viem'
import { computed, ref } from 'vue'
import EIP712ABI from '@/artifacts/abi/CashRemunerationEIP712.json'
import { getBalance } from 'viem/actions'
import { config } from '@/wagmi.config'
import { useCustomFetch } from '@/composables'
import ButtonUI from '@/components/ButtonUI.vue'
import { USDC_ADDRESS } from '@/constant'
import { estimateGas } from '@wagmi/core'
import { useQueryClient } from '@tanstack/vue-query'
import { waitForTransactionReceipt } from '@wagmi/core'

const props = defineProps<{ claim: CRSignClaim; isWeeklyClaim?: boolean }>()
const emit = defineEmits(['claim-withdrawn'])

const userDataStore = useUserDataStore()
const teamStore = useTeamStore()
const toastStore = useToastStore()
const queryClient = useQueryClient()
const userStore = useUserDataStore()

const signedQueryKey = computed(
  () => `signed-weekly-claims-${teamStore.currentTeam?.id}-${userStore.address}`
)

const cashRemunerationEip712Address = computed(
  () =>
    teamStore.currentTeam?.teamContracts.find(
      (contract) => contract.type === 'CashRemunerationEIP712'
    )?.address as Address
)
const { writeContractAsync: withdraw } = useWriteContract()

const { execute: updateClaimStatus, error: updateClaimError } = useCustomFetch(
  computed(
    () => `/${props.isWeeklyClaim ? 'weeklyClaim' : 'claim'}/${props.claim.id}/?action=withdraw`
  ),
  {
    immediate: false
  }
)
  .put()
  .json()

const isLoading = ref(false)

const withdrawClaim = async () => {
  isLoading.value = true
  // balance check
  const balance = formatEther(
    await getBalance(config.getClient(), {
      address: cashRemunerationEip712Address.value
    })
  )
  if (
    Number(balance) <
    Number(props.claim.wage.ratePerHour.find((rate) => rate.type === 'native')) *
      Number(props.claim.hoursWorked)
  ) {
    isLoading.value = false
    toastStore.addErrorToast('Insufficient balance')
    return
  }

  const { claim } = props

  const claimData = {
    hoursWorked: claim.hoursWorked,
    employeeAddress: claim.wage.userAddress as Address,
    date: BigInt(Math.floor(new Date(claim.createdAt).getTime() / 1000)),
    wages: claim.wage.ratePerHour.map((rate) => ({
      hourlyRate:
        rate.type === 'native' ? parseEther(`${rate.amount}`) : parseUnits(`${rate.amount}`, 6), // Convert to wei (assuming 6 decimals for USDC)
      tokenAddress:
        rate.type === 'native'
          ? (zeroAddress as Address)
          : rate.type === 'usdc'
            ? (USDC_ADDRESS as Address)
            : (teamStore.currentTeam?.teamContracts.find(
                (contract) => contract.type === 'InvestorsV1'
              )?.address as Address)
    }))
  }

  // withdraw
  try {
    const args = {
      abi: EIP712ABI,
      functionName: 'withdraw',
      args: [claimData, props.claim.signature as Address]
    }
    const data = encodeFunctionData(args)
    // First run estimate gas to get errors
    await estimateGas(config, {
      to: cashRemunerationEip712Address.value,
      data
    })

    const hash = await withdraw({
      ...args,
      address: cashRemunerationEip712Address.value
      // abi: EIP712ABI,
      // address: cashRemunerationEip712Address.value,
      // functionName: 'withdraw',
      // args: [claimData, props.claim.signature as Address]
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
        queryKey: [signedQueryKey.value]
      })

      emit('claim-withdrawn')
    } else {
      toastStore.addErrorToast('Transaction failed: Failed to withdraw claim')
    }

    isLoading.value = false
  } catch (error) {
    isLoading.value = false
    log.info('Withdraw error', parseError(error))
    const parsed = parseError(error)
    if (parsed.includes('Insufficient token balance')) {
      toastStore.addErrorToast('Insufficient token balance')
    } else if (
      parsed.includes('Token not supported') ||
      parsed.includes('Token not support') ||
      parsed.includes('unsupported token')
    ) {
      toastStore.addErrorToast('Add Token support: Token not supported')
    } else {
      toastStore.addErrorToast('Failed to withdraw')
    }
  }
}
</script>

<style scoped></style>
