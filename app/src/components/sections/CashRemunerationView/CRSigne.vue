<template>
  <ButtonUI
    v-if="weeklyClaim.status == 'pending' && teamOwner == userDataStore.address"
    variant="success"
    data-test="approve-button"
    :disabled="loading || disabled"
    size="sm"
    @click="async () => await approveClaim(weeklyClaim as ClaimResponse)"
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
import type { ClaimResponse, RatePerHour } from '@/types'
import { log } from '@/utils'
import { computed, onMounted, ref } from 'vue'
import { USDC_ADDRESS } from '@/constant'

// Props weeklyClaim : ClaimResponse
const props = defineProps<{
  weeklyClaim: Pick<ClaimResponse, 'id' | 'status' | 'hoursWorked' | 'createdAt'> & {
    wage: {
      ratePerHour: RatePerHour
      userAddress: Address
    }
  }
  // isWeeklyClaim?: boolean
  disabled?: boolean
}>()
const emit = defineEmits(['weeklyClaim-signed'])

// Stores
const teamStore = useTeamStore()
const userDataStore = useUserDataStore()
const toastStore = useToastStore()

// Composables
const { signTypedDataAsync, data: signature } = useSignTypedData()
const chainId = useChainId()

// Computed properties
const teamOwner = computed(() => teamStore.currentTeam?.ownerAddress)
const claimUrl = computed(() => `/weeklyclaim/${props.weeklyClaim.id}/?action=sign`)

const loading = ref(false)

const {
  // data: claimUpdateData,
  // isFetching: isClaimUpdateing,
  error: claimError,
  execute: executeUpdateClaim
} = useCustomFetch(claimUrl, { immediate: false })
  .put(() => ({
    signature: signature.value
  }))
  .json<Array<ClaimResponse>>()

const approveClaim = async (weeklyClaim: ClaimResponse) => {
  loading.value = true

  try {
    await signTypedDataAsync({
      domain: {
        name: 'CashRemuneration',
        version: '1',
        chainId: chainId.value,
        verifyingContract: teamStore.getContractAddressByType('CashRemunerationEIP712') as Address
      },
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
      message: {
        hoursWorked: weeklyClaim.hoursWorked,
        employeeAddress: weeklyClaim.wage.userAddress as Address,
        date: BigInt(Math.floor(new Date(weeklyClaim.createdAt).getTime() / 1000)),
        wages: weeklyClaim.wage.ratePerHour.map((rate) => ({
          hourlyRate:
            rate.type === 'native' ? parseEther(`${rate.amount}`) : parseUnits(`${rate.amount}`, 6), // Convert to wei (assuming 6 decimals for USDC)
          tokenAddress:
            rate.type === 'native'
              ? (zeroAddress as Address)
              : rate.type === 'usdc'
                ? (USDC_ADDRESS as Address)
                : (teamStore.getContractAddressByType('InvestorsV1') as Address)
        }))
      },
      primaryType: 'WageClaim'
    })
  } catch (error) {
    const typedError = error as { message: string }
    log.error('Failed to sign weeklyClaim', typedError.message)
    let errorMessage = 'Failed to sign weeklyClaim'
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
      toastStore.addErrorToast('Failed to approve weeklyClaim')
    } else {
      toastStore.addSuccessToast('Claim approved')
      // Emit event to refresh table
      emit('weeklyClaim-signed')
    }
  }

  loading.value = false
}

onMounted(() => {
  console.log('CRSigne mounted with weeklyClaim:', props.weeklyClaim)
})
</script>

<style scoped></style>
