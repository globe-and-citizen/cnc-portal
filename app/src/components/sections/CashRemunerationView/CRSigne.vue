<template>
  <UTooltip
    v-if="isCashRemunerationOwner && !isDropDown"
    :text="isSignFrozen ? frozenTooltip : undefined"
    :content="{ side: 'top' }"
  >
    <UButton
      color="success"
      data-test="approve-button"
      :disabled="isLoad || disabled || isCurrentWeek || isSignFrozen"
      :loading="isLoad"
      size="sm"
      @click="handleApprove"
    >
      Approve
    </UButton>
  </UTooltip>
  <UTooltip
    v-else-if="isDropDown"
    :text="isSignFrozen ? frozenTooltip : undefined"
    :content="{ side: 'top' }"
  >
    <div
      data-test="sign-action"
      :class="['text-sm', { disabled: isLoad || isSignFrozen }]"
      :aria-disabled="isLoad || isSignFrozen"
      :tabindex="isLoad || isSignFrozen ? -1 : 0"
      :style="{ pointerEvents: isLoad ? 'none' : undefined }"
      @click="handleDropdownClick"
    >
      <UIcon v-if="isLoad" name="i-lucide-loader-circle" class="mr-2 h-3 w-3 animate-spin" />
      {{ isResign ? 'Resign' : 'Sign' }}
    </div>
  </UTooltip>
</template>

<script setup lang="ts">
import { CASH_REMUNERATION_EIP712_ABI } from '@/artifacts/abi/cash-remuneration-eip712'
import { useToast } from '@nuxt/ui/composables'
import { USDC_ADDRESS } from '@/constant'
import { useTeamStore, useUserDataStore } from '@/stores'
import type { WeeklyClaim } from '@/types'
import { buildWageClaimPayload, log } from '@/utils'
import { useChainId, useReadContract, useSignTypedData } from '@wagmi/vue'
import { readContract } from '@wagmi/core'
import dayjs from 'dayjs'
import { keccak256, zeroAddress, type Address } from 'viem'
import { computed, ref, watch } from 'vue'
import { config } from '@/wagmi.config'
import { useUpdateWeeklyClaimMutation } from '@/queries'
import { useEnableClaim } from '@/composables/cashRemuneration/writes'
import {
  CASH_REMUNERATION_EIP712_TYPES,
  buildCashRemunerationDomain
} from './cashRemunerationEip712'
import { useTeamWriteGuard } from '@/composables/useTeamWriteGuard'
import { TEAM_ARCHIVED_TOOLTIP } from '@/composables/useTeamWriteGuard'

const props = defineProps<{
  weeklyClaim: WeeklyClaim
  disabled?: boolean
  isDropDown?: boolean
  isResign?: boolean
}>()

const emit = defineEmits(['close'])

// Stores
const teamStore = useTeamStore()
const toast = useToast()
const userStore = useUserDataStore()

// Computed values
const cashRemunerationAddress = computed(() =>
  teamStore.getContractAddressByType('CashRemunerationEIP712')
)

const currentWeekStart = dayjs().utc().startOf('isoWeek').toISOString()
const isCurrentWeek = computed(() => currentWeekStart === props.weeklyClaim.weekStart)

// Composables
const { mutateAsync } = useSignTypedData()
const chainId = useChainId()

const isLoading = ref(false)
const isLoad = computed(() => isLoading.value)

const { data: cashRemunerationOwner, error: cashRemunerationOwnerError } = useReadContract({
  functionName: 'owner',
  address: cashRemunerationAddress.value,
  abi: CASH_REMUNERATION_EIP712_ABI
})

const isCashRemunerationOwner = computed(() => cashRemunerationOwner.value === userStore.address)

// Block sign actions while the team is on the previous Officer generation
// (issue #1825). A new signature would be bound to the new contract typehash
// while the team is still using the old contract on-chain — pointless and
// confusing. Resigning a stale signature against the *current* contract is
// the explicit follow-up flow once the redeploy lands.
const { isWriteDisabled: isTeamArchived } = useTeamWriteGuard()
const isTeamMigrated = computed(() => teamStore.currentTeamMeta.data?.isMigrated !== false)
const isSignFrozen = computed(() => !isTeamMigrated.value || isTeamArchived.value)
const frozenTooltip = computed(() => {
  if (isTeamArchived.value) return TEAM_ARCHIVED_TOOLTIP
  if (!isTeamMigrated.value) {
    return 'Signing is disabled until your team migrates to the new CashRemuneration contract.'
  }
  return undefined
})

const { error: claimError, mutateAsync: executeUpdateClaim } = useUpdateWeeklyClaimMutation()

const enableTx = useEnableClaim()

const typedDataDomain = computed(() =>
  buildCashRemunerationDomain({
    chainId: chainId.value,
    verifyingContract: cashRemunerationAddress.value as Address
  })
)

// Helper functions
const getTokenAddress = (type: string): Address => {
  if (type === 'native') return zeroAddress as Address
  if (type === 'usdc') return USDC_ADDRESS as Address
  return teamStore.getInvestorAddress() as Address
}

const typedDataMessage = computed(() =>
  buildWageClaimPayload({ weeklyClaim: props.weeklyClaim, getTokenAddress })
)

const setLoadingState = (state: boolean) => {
  isLoading.value = state
}

const enableClaim = async (signature: `0x${string}`) => {
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

  await enableTx.mutateAsync({ args: [keccak256(signature)] })
}

const approveClaim = async () => {
  setLoadingState(true)

  try {
    const signature = await mutateAsync({
      domain: typedDataDomain.value,
      types: CASH_REMUNERATION_EIP712_TYPES,
      message: typedDataMessage.value,
      primaryType: 'WageClaim'
    })

    if (!signature) {
      toast.add({ title: 'Signature not found', color: 'error' })
      return
    }

    await enableClaim(signature as `0x${string}`)
    // Send the verifying contract + the typed-data envelope so the backend
    // can authenticate the signature (recoverTypedDataAddress) and tag the
    // row with the contract it was bound to. bigint fields (`date`,
    // `hourlyRate`) are stringified — JSON can't carry bigints natively.
    await executeUpdateClaim({
      pathParams: { claimId: props.weeklyClaim.id },
      queryParams: { action: 'sign' },
      body: {
        signature,
        signedAgainstContractAddress: cashRemunerationAddress.value as Address,
        chainId: chainId.value,
        typedDataMessage: {
          employeeAddress: typedDataMessage.value.employeeAddress,
          minutesWorked: typedDataMessage.value.minutesWorked,
          date: typedDataMessage.value.date.toString(),
          wages: typedDataMessage.value.wages.map((w) => ({
            hourlyRate: w.hourlyRate.toString(),
            tokenAddress: w.tokenAddress
          }))
        }
      }
    })

    if (claimError.value) {
      toast.add({ title: 'Failed to approve weeklyClaim', color: 'error' })
    } else {
      toast.add({ title: 'Claim approved', color: 'success' })
    }
  } catch (error) {
    const typedError = error as { message?: string }
    log.error('Failed to sign weeklyClaim', typedError.message)

    const errorMessage = typedError.message?.includes('User rejected the request')
      ? 'User rejected the request'
      : 'Failed to sign weeklyClaim'

    toast.add({ title: errorMessage, color: 'error' })
  } finally {
    setLoadingState(false)
  }
}

// Event handlers
const handleApprove = async () => {
  await approveClaim()
}

const handleDropdownClick = async () => {
  if (isLoad.value || isSignFrozen.value) return

  if (!isCashRemunerationOwner.value) {
    emit('close')
    return
  }

  await approveClaim()
  emit('close')
}

// Watchers
watch(cashRemunerationOwnerError, (value) => {
  if (value) {
    log.error('Failed to fetch cash remuneration owner', value)
    toast.add({ title: 'Failed to fetch cash remuneration owner', color: 'error' })
  }
})
</script>
