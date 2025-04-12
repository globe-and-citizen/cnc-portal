<template>
  <div class="flex flex-col gap-8">
    <div class="flex flex-row gap-5 items-center">
      <h2 data-test="action-title">Action #{{ action.actionId }}</h2>
      <div
        data-test="action-status"
        class="badge badge-sm"
        :class="`${isApproved ? 'badge-primary' : 'badge-secondary'}`"
      >
        {{ isApproved ? 'Approved by You' : 'Waiting for your approval' }}
      </div>
    </div>

    <SkeletonLoading v-if="isApprovedLoading || approvalCountLoading" class="w-96 h-6" />
    <div v-else>
      <div class="flex flex-col justify-between gap-1 text-sm">
        <p data-test="action-description">Description: {{ action.description }}</p>
        <p data-test="action-target-address">
          Target Address:
          <span class="text-xs badge badge-sm badge-primary"
            >{{ action.targetAddress }}
            {{
              action.targetAddress == bankAddress
                ? '(Bank)'
                : action.targetAddress == expenseAccountAddress
                  ? '(Expense Account)'
                  : '(Unknown)'
            }}</span
          >
        </p>
        <p data-test="action-function-name">
          Function Name:
          {{
            action.targetAddress == bankAddress
              ? bankFunctionName
              : action.targetAddress == expenseAccountAddress
                ? expenseFunctionName
                : 'Unknown'
          }}
        </p>
        <p data-test="action-parameters-title">Parameters:</p>
        <ul
          data-test="action-parameters-expense"
          v-if="action.targetAddress == expenseAccountAddress"
        >
          <li data-test="expense-params" v-for="(arg, index) in expenseArgs" :key="index">
            {{ '  ' }} - {{ expenseInputs?.[index] }}: {{ arg }}
          </li>
        </ul>
        <ul data-test="action-parameters-bank" v-if="action.targetAddress == bankAddress">
          <li data-test="bank-params" v-for="(arg, index) in bankArgs" :key="index">
            {{ '  ' }} - {{ bankInputs?.[index] }}: {{ arg }}
          </li>
        </ul>
        <p data-test="action-is-executed">Is Executed: {{ action.isExecuted }}</p>
        <p data-test="action-approval-count">
          Approvals {{ approvalCount }}/{{ boardOfDirectors.length }} board of directors approved
        </p>
        <p data-test="action-created-by">
          Created By:
          <span class="text-xs badge badge-sm badge-primary"
            >{{ action.userAddress }}
            {{
              team.members?.filter((member) => member.address == action.userAddress)?.[0]?.name
            }}</span
          >
        </p>
      </div>
    </div>

    <div
      v-if="!action.isExecuted && boardOfDirectors.includes(currentAddress as Address)"
      class="flex justify-center"
      data-test="button-flex"
    >
      <ButtonUI
        :loading="loadingApprove || loadingRevoke || isConfirmingApprove || isConfirmingRevoke"
        :disabled="loadingApprove || loadingRevoke || isConfirmingApprove || isConfirmingRevoke"
        variant="primary"
        data-test="approve-revoke-button"
        @click="async () => (isApproved ? await revokeAction() : await approveAction())"
      >
        {{ isApproved ? 'Revoke' : 'Approve' }}
      </ButtonUI>
    </div>
  </div>
</template>
<script setup lang="ts">
import type { Action, Team } from '@/types'
import type { Address } from 'viem'
import { useToastStore, useUserDataStore } from '@/stores'
import SkeletonLoading from '@/components/SkeletonLoading.vue'
import { onMounted, watch, computed } from 'vue'
import { useCustomFetch } from '@/composables/useCustomFetch'
import { useBankGetFunction } from '@/composables/bank'
import { useExpenseGetFunction } from '@/composables/useExpenseAccount'
import { useReadContract, useWaitForTransactionReceipt, useWriteContract } from '@wagmi/vue'
import BoDABI from '@/artifacts/abi/bod.json'
import ButtonUI from '@/components/ButtonUI.vue'

const props = defineProps<{
  action: Action
  team: Partial<Team>
  boardOfDirectors: Address[]
}>()

// const votingAddress = computed(() => {
//   const address = props.team.teamContracts?.find((contract) => contract.type === 'Voting')?.address
//   return address as Address
// })

const boardOfDirectorsAddress = computed(() => {
  const address = props.team.teamContracts?.find(
    (contract) => contract.type === 'BoardOfDirectors'
  )?.address
  return address as Address
})

const bankAddress = computed(() => {
  const address = props.team.teamContracts?.find((contract) => contract.type === 'Bank')?.address
  return address as Address
})

const expenseAccountAddress = computed(() => {
  const address = props.team.teamContracts?.find(
    (contract) => contract.type === 'ExpenseAccount'
  )?.address
  return address as Address
})

const emits = defineEmits(['closeModal', 'onExecuted'])

const { addErrorToast, addSuccessToast } = useToastStore()
const { address: currentAddress } = useUserDataStore()
const {
  data: isApproved,
  error: errorIsApproved,
  isLoading: isApprovedLoading,
  refetch: executeIsApproved
} = useReadContract({
  functionName: 'isApproved',
  address: boardOfDirectorsAddress.value,
  abi: BoDABI,
  args: [props.action.actionId, currentAddress]
})
const {
  writeContract: approve,
  error: errorApprove,
  isPending: loadingApprove,
  data: approveHash
} = useWriteContract()
const { isLoading: isConfirmingApprove, isSuccess: isConfirmedApprove } =
  useWaitForTransactionReceipt({
    hash: approveHash
  })
watch(isConfirmingApprove, async (isConfirming, wasConfirming) => {
  if (wasConfirming && !isConfirming && isConfirmedApprove.value) {
    addSuccessToast('Action approved')
    await executeIsExecuted()
    if (isExecuted.value) {
      await useCustomFetch(`actions/${props.action.id}`, {
        immediate: true
      }).patch()
      emits('onExecuted')
    }

    emits('closeModal')
  }
})
const {
  writeContract: revoke,
  error: errorRevoke,
  isPending: loadingRevoke,
  data: revokeHash
} = useWriteContract()
const { isLoading: isConfirmingRevoke, isSuccess: isConfirmedRevoke } =
  useWaitForTransactionReceipt({
    hash: revokeHash
  })
watch(isConfirmingRevoke, async (isConfirming, wasConfirming) => {
  if (wasConfirming && !isConfirming && isConfirmedRevoke.value) {
    addSuccessToast('Action revoked')
    await executeIsExecuted()

    emits('closeModal')
  }
})
const {
  data: approvalCount,
  error: errorApprovalCount,
  isLoading: approvalCountLoading,
  refetch: executeApprovalCount
} = useReadContract({
  functionName: 'approvalCount',
  abi: BoDABI,
  address: boardOfDirectorsAddress.value,
  args: [props.action.actionId]
})
const { data: isExecuted, refetch: executeIsExecuted } = useReadContract({
  functionName: 'isActionExecuted',
  abi: BoDABI,
  address: boardOfDirectorsAddress.value,
  args: [props.action.actionId]
})

const {
  data: bankFunctionName,
  args: bankArgs,
  inputs: bankInputs,
  execute: getBankFunctionName
} = useBankGetFunction(bankAddress.value)
const {
  data: expenseFunctionName,
  args: expenseArgs,
  inputs: expenseInputs,
  execute: getExpenseFunctionName
} = useExpenseGetFunction(expenseAccountAddress.value)
const approveAction = async () => {
  approve({
    abi: BoDABI,
    functionName: 'approve',
    address: boardOfDirectorsAddress.value,
    args: [props.action.actionId]
  })
}

const revokeAction = async () => {
  revoke({
    abi: BoDABI,
    functionName: 'revoke',
    address: boardOfDirectorsAddress.value,
    args: [props.action.actionId]
  })
}

watch(errorIsApproved, () => {
  if (errorIsApproved.value) {
    addErrorToast('Failed to get action approval status')
  }
})
watch(errorApprove, () => {
  if (errorApprove.value) {
    addErrorToast('Failed to approve action')
  }
})
watch(errorRevoke, () => {
  if (errorRevoke.value) {
    addErrorToast('Failed to revoke action')
  }
})

watch(errorApprovalCount, () => {
  if (errorApprovalCount.value) {
    addErrorToast('Failed to get approval count')
  }
})

onMounted(async () => {
  await executeIsApproved()
  await executeApprovalCount()
  if (props.action.targetAddress == bankAddress.value) {
    await getBankFunctionName(props.action.data)
  } else if (props.action.targetAddress == expenseAccountAddress.value) {
    await getExpenseFunctionName(props.action.data)
  }
})
</script>
