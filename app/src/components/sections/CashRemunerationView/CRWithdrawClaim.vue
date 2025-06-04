<template>
  <ButtonUI
    v-if="claim.status == 'signed'"
    :disabled="userDataStore.address != claim.wage.user.address"
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
import type { ClaimResponse } from '@/types'
import { log } from '@/utils'
import { useWaitForTransactionReceipt, useWriteContract } from '@wagmi/vue'
import { formatEther, parseEther, zeroAddress, type Address } from 'viem'
import { computed, ref } from 'vue'
import EIP712ABI from '@/artifacts/abi/CashRemunerationEIP712.json'
import { getBalance } from 'viem/actions'
import { config } from '@/wagmi.config'
import { useCustomFetch } from '@/composables'
import ButtonUI from '@/components/ButtonUI.vue'
import { USDC_ADDRESS } from '@/constant'

const props = defineProps<{ claim: ClaimResponse }>()
const emit = defineEmits(['claim-withdrawn'])

const userDataStore = useUserDataStore()
const teamStore = useTeamStore()
const toastStore = useToastStore()

const cashRemunerationEip712Address = computed(
  () =>
    teamStore.currentTeam?.teamContracts.find(
      (contract) => contract.type === 'CashRemunerationEIP712'
    )?.address as Address
)
const {
  writeContractAsync: withdraw,
  data: withdrawHash,
  error: withdrawError
} = useWriteContract()

const { isSuccess: withdrawSuccess, error: withdrawTrxError } = useWaitForTransactionReceipt({
  hash: withdrawHash
})

const { execute: updateClaimStatus, error: updateClaimError } = useCustomFetch(
  computed(() => `/claim/${props.claim.id}/?action=withdraw`),
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
    Number(props.claim.wage.cashRatePerHour) * Number(props.claim.hoursWorked)
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
    wages: [
      // Native token wage
      ...(claim.wage.cashRatePerHour > 0
        ? [
            {
              hourlyRate: parseEther(String(claim.wage.cashRatePerHour)),
              tokenAddress: zeroAddress as Address
            }
          ]
        : []),
      // SHER token wage
      ...(claim.wage.tokenRatePerHour > 0
        ? [
            {
              hourlyRate: BigInt(claim.wage.tokenRatePerHour * 1e6),
              tokenAddress: teamStore.currentTeam?.teamContracts.find(
                (contract) => contract.type === 'InvestorsV1'
              )?.address as Address
            }
          ]
        : []),
      // USDC token wage
      ...(claim.wage.usdcRatePerHour > 0
        ? [
            {
              hourlyRate: BigInt(claim.wage.usdcRatePerHour * 1e6),
              tokenAddress: USDC_ADDRESS as Address
            }
          ]
        : [])
    ]
  }

  // withdraw
  try {
    await withdraw({
      abi: EIP712ABI,
      address: cashRemunerationEip712Address.value,
      functionName: 'withdraw',
      args: [
        // {
        //   hourlyRate: parseEther(String(props.claim.wage.cashRatePerHour)),
        //   hoursWorked: props.claim.hoursWorked,
        //   employeeAddress: props.claim.wage.user.address as Address,
        //   date: BigInt(Math.floor(new Date(props.claim.createdAt).getTime() / 1000))
        // },
        claimData,
        props.claim.signature
      ]
    })
  } catch (error) {
    toastStore.addErrorToast('Failed to withdraw claim')
    log.info('Withdraw error', error)
  }
  isLoading.value = false

  if (withdrawSuccess.value) {
    toastStore.addSuccessToast('Claim withdrawn')
  }
  if (withdrawError.value) {
    toastStore.addErrorToast('Failed to withdraw claim')
  }
  if (withdrawTrxError.value) {
    toastStore.addErrorToast('Trx failed: Failed to withdraw claim')
  }
  await updateClaimStatus()

  if (updateClaimError.value) {
    toastStore.addErrorToast('Failed to update Claim status')
  }

  // chek if claim is updated
  if (withdrawSuccess.value) {
    emit('claim-withdrawn')
  }
  isLoading.value = false
}
</script>

<style scoped></style>
