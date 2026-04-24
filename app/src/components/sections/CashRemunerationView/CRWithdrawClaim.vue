<template>
  <a
    v-if="isDropDown"
    data-test="withdraw-action"
    :class="['text-sm', { disabled: withdrawTx.isPending.value }]"
    :aria-disabled="withdrawTx.isPending.value"
    :tabindex="withdrawTx.isPending.value ? -1 : 0"
    :style="{ pointerEvents: withdrawTx.isPending.value ? 'none' : undefined }"
    @click="
      async () => {
        if (withdrawTx.isPending.value) return
        if (!isClaimOwner) {
          emit('claim-withdrawn')
          return
        }
        await withdrawClaim()
        emit('claim-withdrawn')
      }
    "
  >
    <span v-if="withdrawTx.isPending.value" class="loading loading-spinner loading-xs mr-2"></span>
    Withdraw
  </a>
  <UButton
    v-else
    :disabled="disabled"
    :loading="withdrawTx.isPending.value"
    color="warning"
    data-test="withdraw-button"
    size="sm"
    @click="async () => await withdrawClaim()"
    label="Withdraw"
  />
</template>

<script setup lang="ts">
import { useTeamStore } from '@/stores'
import { buildWageClaimPayload, classifyError, log } from '@/utils'
import { recoverTypedDataAddress, zeroAddress, type Address } from 'viem'
import { readContract } from '@wagmi/core'
import { useChainId } from '@wagmi/vue'
import { config } from '@/wagmi.config'
import { CASH_REMUNERATION_EIP712_ABI } from '@/artifacts/abi/cash-remuneration-eip712'
import { USDC_ADDRESS } from '@/constant'
import type { WeeklyClaim } from '@/types'
import { useSyncWeeklyClaimsMutation } from '@/queries'
import { useWithdraw } from '@/composables/cashRemuneration/writes'

const props = defineProps<{
  weeklyClaim: WeeklyClaim
  disabled?: boolean
  isDropDown?: boolean
  isClaimOwner?: boolean
}>()

const emit = defineEmits(['claim-withdrawn'])

const teamStore = useTeamStore()
const toast = useToast()

const withdrawTx = useWithdraw()
const chainId = useChainId()

const { mutateAsync: syncWeeklyClaim, error: syncWeeklyClaimError } = useSyncWeeklyClaimsMutation()

const TYPED_DATA_TYPES = {
  Wage: [
    { name: 'hourlyRate', type: 'uint256' },
    { name: 'tokenAddress', type: 'address' }
  ],
  WageClaim: [
    { name: 'employeeAddress', type: 'address' },
    { name: 'minutesWorked', type: 'uint16' },
    { name: 'wages', type: 'Wage[]' },
    { name: 'date', type: 'uint256' }
  ]
} as const

const getTokenAddress = (type: string): Address => {
  if (type === 'native') return zeroAddress as Address
  if (type === 'usdc') return USDC_ADDRESS as Address
  return teamStore.getContractAddressByType('InvestorV1') as Address
}

const withdrawClaim = async () => {
  if (withdrawTx.isPending.value) return

  const currentContract = teamStore.getContractAddressByType('CashRemunerationEIP712') as
    | Address
    | undefined

  if (!currentContract) {
    toast.add({ title: 'Cash Remuneration EIP712 contract address not found', color: 'error' })
    return
  }

  // Guard 1 — DB source of truth: if the claim carries the contract/chain it was signed
  // for, block the withdraw when it doesn't match the currently active deployment.
  const signedFor = props.weeklyClaim.data
  if (
    signedFor?.contractAddress &&
    signedFor.contractAddress.toLowerCase() !== currentContract.toLowerCase()
  ) {
    toast.add({
      title: 'Signature issued for a different CashRemuneration contract',
      description: `Signed for ${signedFor.contractAddress}, active contract ${currentContract}.`,
      color: 'error'
    })
    return
  }
  if (signedFor?.chainId && signedFor.chainId !== chainId.value) {
    toast.add({
      title: 'Signature issued on a different network',
      description: `Signed on chain ${signedFor.chainId}, active network ${chainId.value}.`,
      color: 'error'
    })
    return
  }

  const claimData = buildWageClaimPayload({ weeklyClaim: props.weeklyClaim, getTokenAddress })

  // Guard 2 — EIP-712 recovery against the currently active contract. Catches legacy
  // signatures with no `data.contractAddress` and any mismatch missed by Guard 1.
  const signature = props.weeklyClaim.signature as `0x${string}` | null
  if (!signature) {
    toast.add({ title: 'Missing signature', color: 'error' })
    return
  }

  try {
    const [recovered, contractOwner] = await Promise.all([
      recoverTypedDataAddress({
        domain: {
          name: 'CashRemuneration',
          version: '1',
          chainId: chainId.value,
          verifyingContract: currentContract
        },
        types: TYPED_DATA_TYPES,
        primaryType: 'WageClaim',
        message: {
          employeeAddress: claimData.employeeAddress,
          minutesWorked: claimData.minutesWorked,
          wages: claimData.wages,
          date: claimData.date
        },
        signature
      }),
      readContract(config, {
        address: currentContract,
        abi: CASH_REMUNERATION_EIP712_ABI,
        functionName: 'owner'
      }) as Promise<Address>
    ])

    if (recovered.toLowerCase() !== contractOwner.toLowerCase()) {
      const sameContractAndChain =
        !!signedFor?.contractAddress &&
        signedFor.contractAddress.toLowerCase() === currentContract.toLowerCase() &&
        signedFor.chainId === chainId.value

      toast.add({
        title: sameContractAndChain
          ? 'Signature no longer valid — contract ownership has changed'
          : 'Invalid signature for this contract',
        description: sameContractAndChain
          ? `Signed by ${recovered}, current owner is ${contractOwner}. Please request a new signature from the current owner.`
          : 'This signature was issued for a different contract or network. Please request a new signature.',
        color: 'error'
      })
      return
    }
  } catch (error) {
    log.error('Signature verification failed', error)
    toast.add({ title: 'Signature verification failed', color: 'error' })
    return
  }

  // withdraw
  withdrawTx.mutate(
    { args: [claimData, signature] },
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
      },
      onError: (error) => {
        log.error('Withdraw error', error)

        const classified = classifyError(error, { contract: 'CashRemuneration' })

        // Silent when user cancels from wallet — nothing to show.
        if (classified.category === 'user_rejected') return

        toast.add({
          title: classified.userMessage,
          color: 'error'
        })
      }
    }
  )
}
</script>
