<template>
  <ButtonUI
    v-if="claim.status == 'signed'"
    :disabled="userDataStore.address != claim.wage.user.address"
    :loading="isLoading"
    variant="warning"
    data-test="withdraw-button"
    @click="async () => await withdrawClaim()"
    >Withdraw</ButtonUI
  >
</template>

<script setup lang="ts">
import { useTeamStore, useToastStore, useUserDataStore } from '@/stores'
import type { ClaimResponse } from '@/types'
import { log, parseError } from '@/utils'
import {
  useChainId,
  useSignTypedData,
  useWaitForTransactionReceipt,
  useWriteContract
} from '@wagmi/vue'
import { formatEther, parseEther, type Address } from 'viem'
import { ref, watch } from 'vue'
import EIP712ABI from '@/artifacts/abi/CashRemunerationEIP712.json'
import { getBalance } from 'viem/actions'
import { config } from '@/wagmi.config'
import { useCustomFetch } from '@/composables'
import ButtonUI from '@/components/ButtonUI.vue'

const props = defineProps<{ claim: ClaimResponse }>()

const userDataStore = useUserDataStore()
const teamStore = useTeamStore()
const toastStore = useToastStore()

const {
  writeContractAsync: withdraw,
  data: withdrawHash,
  error: withdrawError
} = useWriteContract()

const { isSuccess: withdrawSuccess, error: withdrawTrxError } = useWaitForTransactionReceipt({
  hash: withdrawHash
})

// const { execute: updateClaimStatus } = useCustomFetch(`claim/${props.claim.id}/validate-withdraw`, {
//   immediate: false
// })
//   .put()
//   .json()

const isLoading = ref(false)

const withdrawClaim = async () => {
  isLoading.value = true
  // balance check
  const balance = formatEther(
    await getBalance(config.getClient(), {
      address: teamStore.currentTeam?.cashRemunerationEip712Address as Address
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

  // withdraw
  try {
    await withdraw({
      abi: EIP712ABI,
      address: teamStore.currentTeam?.cashRemunerationEip712Address as Address,
      functionName: 'withdraw',
      args: [
        {
          hourlyRate: parseEther(String(props.claim.wage.cashRatePerHour)),
          hoursWorked: props.claim.hoursWorked,
          employeeAddress: props.claim.wage.user.address as Address,
          date: BigInt(Math.floor(new Date(props.claim.createdAt).getTime() / 1000))
        },
        props.claim.signature
      ]
    })

    // await updateClaimStatus()
  } catch (error) {
    toastStore.addErrorToast('Failed to withdraw claim')
    log.info('Withdraw error', error)
  }
  isLoading.value = false

  if (withdrawSuccess.value) {
    toastStore.addSuccessToast('Claim withdrawn')
    return
  }
  if (withdrawError.value) {
    toastStore.addErrorToast('Failed to withdraw claim')
    return
  }
  if (withdrawTrxError.value) {
    toastStore.addErrorToast('Trx failed: Failed to withdraw claim')
    return
  }
}
</script>

<style scoped></style>
