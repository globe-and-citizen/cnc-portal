<template>
  <ButtonUI
    v-if="claim.status == 'pending' && teamOwner == userDataStore.address"
    variant="success"
    data-test="approve-button"
    :disabled="loading"
    size="sm"
    @click="async () => await approveClaim(claim as ClaimResponse)"
  >
    Approve
  </ButtonUI>
</template>

<script setup lang="ts">
import ButtonUI from '@/components/ButtonUI.vue'
import { useCustomFetch } from '@/composables'
import { useChainId, useSignTypedData } from '@wagmi/vue'
import { parseEther, parseUnits, zeroAddress, type Address } from 'viem'
import { useTeamStore, useToastStore, useUserDataStore } from '@/stores'
import type { ClaimResponse } from '@/types'
import { log } from '@/utils'
import { computed, onMounted, ref } from 'vue'
import { USDC_ADDRESS } from '@/constant'

// Props claim : ClaimResponse
const props = defineProps<{ claim: ClaimResponse }>()
const emit = defineEmits(['claim-signed'])

// Stores
const teamStore = useTeamStore()
const userDataStore = useUserDataStore()
const toastStore = useToastStore()

// Composables
const { signTypedDataAsync, data: signature } = useSignTypedData()
const chainId = useChainId()

// Computed properties
const teamOwner = computed(() => teamStore.currentTeam?.ownerAddress)

// const { signature, execute: signClaim } = useSignWageClaim()
const loading = ref(false)

const {
  // data: claimUpdateData,
  // isFetching: isClaimUpdateing,
  error: claimError,
  execute: executeUpdateClaim
} = useCustomFetch(
  computed(() => `/claim/${props.claim.id}/?action=sign`),
  { immediate: false }
)
  .put(() => ({
    signature: signature.value
  }))
  .json<Array<ClaimResponse>>()

const cashRemunerationEip712Address = computed(
  () =>
    teamStore.currentTeam?.teamContracts.find(
      (contract) => contract.type === 'CashRemunerationEIP712'
    )?.address as Address
)
const approveClaim = async (claim: ClaimResponse) => {
  loading.value = true

  try {
    // await signClaim(claim)
    await signTypedDataAsync({
      domain: {
        name: 'CashRemuneration',
        version: '1',
        chainId: chainId.value,
        verifyingContract: cashRemunerationEip712Address.value
      },
      // types: {
      //   WageClaim: [
      //     { name: 'employeeAddress', type: 'address' },
      //     { name: 'hoursWorked', type: 'uint8' },
      //     { name: 'hourlyRate', type: 'uint256' },
      //     { name: 'date', type: 'uint256' }
      //   ]
      // },
      types: {
        Wage: [
          { name: 'hourlyRate', type: 'uint256' },
          { name: 'tokenAddress', type: 'address' }
        ],
        WageClaim: [
          { name: 'employeeAddress', type: 'address' },
          { name: 'hoursWorked', type: 'uint8' },
          { name: 'wages', type: 'Wage[]' },
          { name: 'date', type: 'uint256' }
        ]
      },
      // message: {
      //   hourlyRate: parseEther(String(claim.wage.cashRatePerHour)),
      //   hoursWorked: claim.hoursWorked,
      //   employeeAddress: claim.wage.userAddress as Address,
      //   date: BigInt(Math.floor(new Date(claim.createdAt).getTime() / 1000))
      // },
      message: {
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

        /*[
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
        ]*/
      },
      primaryType: 'WageClaim'
    })
  } catch (error) {
    const typedError = error as { message: string }
    log.error('Failed to sign claim', typedError.message)
    let errorMessage = 'Failed to sign claim'
    if (typedError.message.includes('User rejected the request')) {
      if (typedError.message.includes('User rejected the request')) {
        errorMessage = 'User rejected the request'
      }
      toastStore.addErrorToast(errorMessage)
    }
  }
  if (signature.value) {
    await executeUpdateClaim()
    if (claimError.value) {
      toastStore.addErrorToast('Failed to approve claim')
    } else {
      toastStore.addSuccessToast('Claim approved')
      // Emit event to refresh table
      emit('claim-signed')
    }
  }

  loading.value = false
}

onMounted(() => {
  console.log('CRSigne mounted with claim:', props.claim)
})
</script>

<style scoped></style>
