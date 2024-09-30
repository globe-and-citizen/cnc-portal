<template>
  <div class="flex flex-col gap-8">
    <div class="flex flex-row gap-5 items-center">
      <h2>Action #{{ action.actionId }}</h2>
      <div class="badge badge-sm" :class="`${isApproved ? 'badge-primary' : 'badge-secondary'}`">
        {{ isApproved ? 'Approved by You' : 'Waiting for your approval' }}
      </div>
    </div>

    <SkeletonLoading v-if="isApprovedLoading || approvalCountLoading" class="w-96 h-6" />
    <div v-else>
      <div class="flex flex-col justify-between gap-1 text-sm">
        <p>Description: {{ action.description }}</p>
        <p>
          Target Address:
          <span class="text-xs badge badge-sm badge-primary"
            >{{ action.targetAddress }}
            {{ action.targetAddress == team.bankAddress ? '(Bank)' : '' }}</span
          >
        </p>
        <p>Is Executed: {{ action.isExecuted }}</p>
        <p>
          Approvals {{ approvalCount }}/{{ boardOfDirectors.length }} board of directors approved
        </p>
        <p>
          Created By:
          <span class="text-xs badge badge-sm badge-primary"
            >{{ action.userAddress }}
            {{
              team.members?.filter((member) => member.address == action.userAddress)?.[0].name
            }}</span
          >
        </p>
      </div>
    </div>

    <div
      v-if="!action.isExecuted || !boardOfDirectors.includes(currentAddress as Address)"
      class="flex justify-center"
    >
      <LoadingButton
        v-if="loadingApprove || loadingRevoke"
        color="primary"
        class="w-48 text-center"
      />
      <button
        v-else
        class="btn btn-primary w-48"
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
import {
  useApprovalCount,
  useApproveAction,
  useIsActionApproved,
  useRevokeAction,
  useActionExecuted
} from '@/composables/bod'
import { onMounted, watch } from 'vue'
import { useCustomFetch } from '@/composables/useCustomFetch'

const { addErrorToast, addSuccessToast } = useToastStore()
const { address: currentAddress } = useUserDataStore()
const {
  data: isApproved,
  error: errorIsApproved,
  isLoading: isApprovedLoading,
  execute: executeIsApproved
} = useIsActionApproved()
const {
  execute: approve,
  error: errorApprove,
  isLoading: loadingApprove,
  isSuccess: successApprove
} = useApproveAction()
const {
  execute: revoke,
  error: errorRevoke,
  isLoading: loadingRevoke,
  isSuccess: successRevoke
} = useRevokeAction()
const {
  data: approvalCount,
  error: errorApprovalCount,
  isLoading: approvalCountLoading,
  execute: executeApprovalCount
} = useApprovalCount()
const { data: isExecuted, execute: executeIsExecuted } = useActionExecuted()

const props = defineProps<{
  action: Action
  team: Partial<Team>
  boardOfDirectors: Address[]
}>()
const emits = defineEmits(['closeModal'])

const approveAction = async () => {
  await approve(props.team.boardOfDirectorsAddress!, props.action.actionId)
  if (errorApprove.value) {
    return
  }

  await executeIsExecuted(props.team.boardOfDirectorsAddress!, props.action.actionId)
  if (isExecuted.value) {
    useCustomFetch(`actions/${props.action.id}`, {
      immediate: true
    }).patch()
  }

  emits('closeModal')
}

const revokeAction = async () => {
  await revoke(props.team.boardOfDirectorsAddress!, props.action.actionId)

  if (errorRevoke.value) {
    return
  }
  emits('closeModal')
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
watch(successApprove, () => {
  if (successApprove.value) {
    addSuccessToast('Action approved')
    emits('closeModal')
  }
})
watch(successRevoke, () => {
  if (successRevoke.value) {
    addSuccessToast('Action revoked')
    emits('closeModal')
  }
})
watch(errorApprovalCount, () => {
  if (errorApprovalCount.value) {
    addErrorToast('Failed to get approval count')
  }
})

onMounted(async () => {
  await executeIsApproved(
    props.team.boardOfDirectorsAddress!,
    props.action.actionId,
    currentAddress
  )
  await executeApprovalCount(props.team.boardOfDirectorsAddress!, props.action.actionId)
})
</script>
