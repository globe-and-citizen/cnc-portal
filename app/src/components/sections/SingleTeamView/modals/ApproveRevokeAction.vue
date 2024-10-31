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
              action.targetAddress == team.bankAddress
                ? '(Bank)'
                : action.targetAddress == team.expenseAccountAddress
                  ? '(Expense Account)'
                  : '(Unknown)'
            }}</span
          >
        </p>
        <p data-test="action-function-name">
          Function Name:
          {{
            action.targetAddress == team.bankAddress
              ? bankFunctionName
              : action.targetAddress == team.expenseAccountAddress
                ? expenseFunctionName
                : 'Unknown'
          }}
        </p>
        <p data-test="action-parameters-title">Parameters:</p>
        <ul
          data-test="action-parameters-expense"
          v-if="action.targetAddress == team.expenseAccountAddress"
        >
          <li data-test="expense-params" v-for="(arg, index) in expenseArgs" :key="index">
            {{ '  ' }} - {{ expenseInputs?.[index] }}: {{ arg }}
          </li>
        </ul>
        <ul data-test="action-parameters-bank" v-if="action.targetAddress == team.bankAddress">
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
      <LoadingButton
        v-if="loadingApprove || loadingRevoke || isConfirmingApprove || isConfirmingRevoke"
        color="primary"
        class="w-48 text-center"
      />
      <button
        v-else
        class="btn btn-primary w-48"
        data-test="approve-revoke-button"
        @click="async () => (isApproved ? await revokeAction() : await approveAction())"
      >
        {{ isApproved ? 'Revoke' : 'Approve' }}
      </button>
    </div>
  </div>
</template>
<script setup lang="ts">
import type { Action, Team } from '@/types'
import type { Address } from 'viem'
import { useToastStore, useUserDataStore } from '@/stores'
import SkeletonLoading from '@/components/SkeletonLoading.vue'
import LoadingButton from '@/components/LoadingButton.vue'
import { onMounted, watch } from 'vue'
import { useCustomFetch } from '@/composables/useCustomFetch'
import { useBankGetFunction } from '@/composables/bank'
import { useExpenseGetFunction } from '@/composables/useExpenseAccount'
import { useReadContract, useWaitForTransactionReceipt, useWriteContract } from '@wagmi/vue'
import BoDABI from '@/artifacts/abi/bod.json'

const props = defineProps<{
  action: Action
  team: Partial<Team>
  boardOfDirectors: Address[]
}>()
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
  address: props.team.boardOfDirectorsAddress as Address,
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
  address: props.team.boardOfDirectorsAddress as Address,
  args: [props.action.actionId]
})
const { data: isExecuted, refetch: executeIsExecuted } = useReadContract({
  functionName: 'isActionExecuted',
  abi: BoDABI,
  address: props.team.boardOfDirectorsAddress as Address,
  args: [props.action.actionId]
})

const {
  data: bankFunctionName,
  args: bankArgs,
  inputs: bankInputs,
  execute: getBankFunctionName
} = useBankGetFunction(props.team.bankAddress!)
const {
  data: expenseFunctionName,
  args: expenseArgs,
  inputs: expenseInputs,
  execute: getExpenseFunctionName
} = useExpenseGetFunction(props.team.expenseAccountAddress!)
const approveAction = async () => {
  approve({
    abi: BoDABI,
    functionName: 'approve',
    address: props.team.boardOfDirectorsAddress as Address,
    args: [props.action.actionId]
  })
}

const revokeAction = async () => {
  revoke({
    abi: BoDABI,
    functionName: 'revoke',
    address: props.team.boardOfDirectorsAddress as Address,
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
    console.log(errorApprove.value)
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
  if (props.action.targetAddress == props.team.bankAddress) {
    await getBankFunctionName(props.action.data)
  } else if (props.action.targetAddress == props.team.expenseAccountAddress) {
    await getExpenseFunctionName(props.action.data)
  }
})
</script>
