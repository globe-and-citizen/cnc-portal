<template>
  <ButtonUI
    v-if="isCashRemunerationOwner && !isDropDown"
    variant="success"
    data-test="approve-button"
    :disabled="isLoad || disabled || currentWeekStart === weeklyClaim.weekStart"
    :loading="isLoad"
    size="sm"
    @click="async () => await approveClaim(weeklyClaim)"
  >
    Approve
  </ButtonUI>
  <a
    v-else-if="isDropDown"
    data-test="sign-action"
    :class="['text-sm', { disabled: isLoad }]"
    :aria-disabled="isLoad"
    :tabindex="isLoad ? -1 : 0"
    :style="{ pointerEvents: isLoad ? 'none' : undefined }"
    @click="
      async () => {
        if (isLoad) return
        if (!isCashRemunerationOwner) {
          $emit('close')
          return
        }
        emit('loading', true)
        await approveClaim(weeklyClaim)
        // loading cleared inside approveClaim only on success
        $emit('close')
      }
    "
  >
    <span v-if="isLoad" class="loading loading-spinner loading-xs mr-2"></span>
    {{ isResign ? 'Resign' : 'Sign' }}
  </a>
</template>

<script setup lang="ts">
import { CASH_REMUNERATION_EIP712_ABI } from '@/artifacts/abi/cash-remuneration-eip712'
import ButtonUI from '@/components/ButtonUI.vue'
import { useCustomFetch } from '@/composables'
import { USDC_ADDRESS } from '@/constant'
import { useTeamStore, useToastStore, useUserDataStore } from '@/stores'
import type { WeeklyClaim } from '@/types'
import { log } from '@/utils'
import { useQueryClient } from '@tanstack/vue-query'
import { useChainId, useReadContract, useSignTypedData } from '@wagmi/vue'
import {
  readContract,
  writeContract,
  simulateContract,
  waitForTransactionReceipt
} from '@wagmi/core'
import dayjs from 'dayjs'
import { keccak256, parseEther, parseUnits, zeroAddress, type Address } from 'viem'
import { computed, ref, watch } from 'vue'
import { config } from '@/wagmi.config'

const props = defineProps<{
  weeklyClaim: WeeklyClaim
  disabled?: boolean
  isDropDown?: boolean
  isResign?: boolean
  loading?: boolean
}>()

const emit = defineEmits(['close', 'loading'])

// Stores
const teamStore = useTeamStore()
// const userDataStore = useUserDataStore()
const toastStore = useToastStore()
const userStore = useUserDataStore()
const queryClient = useQueryClient()

const cashRemunerationAddress = computed(() =>
  teamStore.getContractAddressByType('CashRemunerationEIP712')
)

const currentWeekStart = dayjs().utc().startOf('isoWeek').toISOString()

// Composables
const { signTypedDataAsync, data: signature } = useSignTypedData()
const chainId = useChainId()

const isloading = ref(false)
const isLoad = computed(() => (props.loading ?? isloading.value) as boolean)

const {
  data: cashRemunerationOwner,
  // isFetching: isCashRemunerationOwnerFetching,
  error: cashRemunerationOwnerError
} = useReadContract({
  functionName: 'owner',
  address: cashRemunerationAddress,
  abi: CASH_REMUNERATION_EIP712_ABI
})

// Compute if user has approval access (is cash remuneration contract owner)
const isCashRemunerationOwner = computed(() => cashRemunerationOwner.value === userStore.address)
const weeklyClaimUrl = computed(() => `/weeklyclaim/${props.weeklyClaim.id}/?action=sign`)

const {
  // data: claimUpdateData,
  // isFetching: isClaimUpdateing,
  error: claimError,
  execute: executeUpdateClaim
} = useCustomFetch(weeklyClaimUrl, { immediate: false })
  .put(() => ({
    signature: signature.value,
    data: { ownerAddress: userStore.address }
  }))
  .json<Array<WeeklyClaim>>()

const approveClaim = async (weeklyClaim: WeeklyClaim) => {
  isloading.value = true
  emit('loading', true)

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
                : (teamStore.getContractAddressByType('InvestorV1') as Address)
        }))
      },
      primaryType: 'WageClaim'
    })

    if (signature.value) {
      await enableClaim(signature.value)
      await executeUpdateClaim()

      if (claimError.value) {
        toastStore.addErrorToast('Failed to approve weeklyClaim')
        // keep loading until explicit success
      } else {
        toastStore.addSuccessToast('Claim approved')
        queryClient.invalidateQueries({
          queryKey: ['weekly-claims', teamStore.currentTeamId]
        })
        isloading.value = false
        emit('loading', false)
      }
    }
  } catch (error) {
    const typedError = error as { message: string }
    log.error('Failed to sign weeklyClaim', typedError.message)
    let errorMessage = 'Failed to sign weeklyClaim'
    if (typedError.message?.includes?.('User rejected the request')) {
      errorMessage = 'User rejected the request'
    }
    toastStore.addErrorToast(errorMessage)
    // Stop loading on cancel/error
    isloading.value = false
    emit('loading', false)
  }
}

const enableClaim = async (signature: Address) => {
  if (!cashRemunerationAddress.value) throw Error('Cash remuneration address not found')
  if (props.isResign) {
    const isDisabled = await readContract(config, {
      address: cashRemunerationAddress.value,
      abi: CASH_REMUNERATION_EIP712_ABI,
      functionName: 'disabledWageClaims',
      args: [keccak256(signature)]
    })

    if (isDisabled) {
      await simulateContract(config, {
        address: cashRemunerationAddress.value,
        abi: CASH_REMUNERATION_EIP712_ABI,
        functionName: 'enableClaim',
        args: [keccak256(signature)]
      })

      const hash = await writeContract(config, {
        address: cashRemunerationAddress.value,
        abi: CASH_REMUNERATION_EIP712_ABI,
        functionName: 'enableClaim',
        args: [keccak256(signature)]
      })

      await waitForTransactionReceipt(config, { hash })
    }
  }
}

watch(cashRemunerationOwnerError, (value) => {
  if (value) {
    log.error('Failed to fetch cash remuneration owner', value)
    toastStore.addErrorToast('Failed to fetch cash remuneration owner')
  }
})
</script>
