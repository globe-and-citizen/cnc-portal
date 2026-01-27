<template>
  <ButtonUI
    v-if="isCashRemunerationOwner && !isDropDown"
    variant="success"
    data-test="approve-button"
    :disabled="isLoad || disabled || isCurrentWeek"
    :loading="isLoad"
    size="sm"
    @click="handleApprove"
  >
    Approve
  </ButtonUI>
  <div
    v-else-if="isDropDown"
    data-test="sign-action"
    :class="['text-sm', { disabled: isLoad }]"
    :aria-disabled="isLoad"
    :tabindex="isLoad ? -1 : 0"
    :style="{ pointerEvents: isLoad ? 'none' : undefined }"
    @click="handleDropdownClick"
  >
    <span v-if="isLoad" class="loading loading-spinner loading-xs mr-2"></span>
    {{ isResign ? 'Resign' : 'Sign' }}
  </div>
</template>

<script setup lang="ts">
import { CASH_REMUNERATION_EIP712_ABI } from '@/artifacts/abi/cash-remuneration-eip712'
import ButtonUI from '@/components/ButtonUI.vue'
import { USDC_ADDRESS } from '@/constant'
import { useTeamStore, useToastStore, useUserDataStore } from '@/stores'
import type { WeeklyClaim } from '@/types'
import { log } from '@/utils'
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
import { useSignWeeklyClaimMutation } from '@/queries'

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
const toastStore = useToastStore()
const userStore = useUserDataStore()

// Computed values
const cashRemunerationAddress = computed(() =>
  teamStore.getContractAddressByType('CashRemunerationEIP712')
)

const currentWeekStart = dayjs().utc().startOf('isoWeek').toISOString()
const isCurrentWeek = computed(() => currentWeekStart === props.weeklyClaim.weekStart)

// Composables
const { signTypedDataAsync, data: signature } = useSignTypedData()
const chainId = useChainId()

const isloading = ref(false)
const isLoad = computed(() => props.loading ?? isloading.value)

const { data: cashRemunerationOwner, error: cashRemunerationOwnerError } = useReadContract({
  functionName: 'owner',
  address: cashRemunerationAddress.value,
  abi: CASH_REMUNERATION_EIP712_ABI
})

const isCashRemunerationOwner = computed(() => cashRemunerationOwner.value === userStore.address)

const { error: claimError, mutateAsync: executeUpdateClaim } = useSignWeeklyClaimMutation()

// Domain configuration (constant)
const typedDataDomain = computed(() => ({
  name: 'CashRemuneration',
  version: '1',
  chainId: chainId.value,
  verifyingContract: cashRemunerationAddress.value as Address
}))

// Type definitions (constant)
const TYPED_DATA_TYPES = {
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
} as const

// Helper functions
const getTokenAddress = (type: string): Address => {
  if (type === 'native') return zeroAddress as Address
  if (type === 'usdc') return USDC_ADDRESS as Address
  return teamStore.getContractAddressByType('InvestorV1') as Address
}

const parseAmount = (amount: number, type: string) => {
  return type === 'native' ? parseEther(`${amount}`) : parseUnits(`${amount}`, 6)
}

const buildTypedDataMessage = (weeklyClaim: WeeklyClaim) => ({
  hoursWorked: weeklyClaim.hoursWorked,
  employeeAddress: weeklyClaim.wage.userAddress as Address,
  date: BigInt(Math.floor(new Date(weeklyClaim.createdAt).getTime() / 1000)),
  wages: weeklyClaim.wage.ratePerHour.map((rate) => ({
    hourlyRate: parseAmount(rate.amount, rate.type),
    tokenAddress: getTokenAddress(rate.type)
  }))
})

const setLoadingState = (state: boolean) => {
  isloading.value = state
  emit('loading', state)
}

const enableClaim = async (signature: Address) => {
  if (!cashRemunerationAddress.value) {
    throw new Error('Cash remuneration address not found')
  }

  if (!props.isResign) return

  const isDisabled = await readContract(config, {
    address: cashRemunerationAddress.value,
    abi: CASH_REMUNERATION_EIP712_ABI,
    functionName: 'disabledWageClaims',
    args: [keccak256(signature)]
  })

  if (!isDisabled) return

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

const approveClaim = async (weeklyClaim: WeeklyClaim) => {
  setLoadingState(true)

  try {
    await signTypedDataAsync({
      domain: typedDataDomain.value,
      types: TYPED_DATA_TYPES,
      message: buildTypedDataMessage(weeklyClaim),
      primaryType: 'WageClaim'
    })

    if (!signature.value) return

    await enableClaim(signature.value)
    await executeUpdateClaim({
      claimId: weeklyClaim.id,
      signature: signature.value,
      data: { ownerAddress: userStore.address }
    })

    if (claimError.value) {
      toastStore.addErrorToast('Failed to approve weeklyClaim')
    } else {
      toastStore.addSuccessToast('Claim approved')
      setLoadingState(false)
    }
  } catch (error) {
    const typedError = error as { message?: string }
    log.error('Failed to sign weeklyClaim', typedError.message)

    const errorMessage = typedError.message?.includes('User rejected the request')
      ? 'User rejected the request'
      : 'Failed to sign weeklyClaim'

    toastStore.addErrorToast(errorMessage)
    setLoadingState(false)
  }
}

// Event handlers
const handleApprove = async () => {
  await approveClaim(props.weeklyClaim)
}

const handleDropdownClick = async () => {
  if (isLoad.value) return

  if (!isCashRemunerationOwner.value) {
    emit('close')
    return
  }

  setLoadingState(true)
  await approveClaim(props.weeklyClaim)
  emit('close')
}

// Watchers
watch(cashRemunerationOwnerError, (value) => {
  if (value) {
    log.error('Failed to fetch cash remuneration owner', value)
    toastStore.addErrorToast('Failed to fetch cash remuneration owner')
  }
})
</script>
