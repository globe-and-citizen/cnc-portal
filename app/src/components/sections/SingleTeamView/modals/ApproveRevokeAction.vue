<template>
  <div class="flex flex-col gap-8">
    <h2>Action #{{ action.id }}</h2>

    <SkeletonLoading v-if="approversLoading" class="w-96 h-6" />

    <div v-if="(approvers?.length ?? 0) > 0 && !approversLoading">
      <div class="overflow-x-auto">
        <table class="table table-xs text-center">
          <thead>
            <tr>
              <th>No</th>
              <th>Name</th>
              <th>Address</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(approver, index) in approvers" :key="index" class="hover">
              <th>{{ index + 1 }}</th>
              <td>
                {{
                  team.members?.filter((member) => member.address == approver)[0].name ?? 'Unknown'
                }}
              </td>
              <td>{{ approver }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <div class="flex justify-center">
      <LoadingButton
        v-if="status === 'pending' || isConfirming"
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
import { useReadContract, useWaitForTransactionReceipt, useWriteContract } from '@wagmi/vue'
import type { Address } from 'viem'
import { BOD_ABI } from '@/artifacts/abi/bod'
import { watch } from 'vue'
import { useToastStore, useUserDataStore } from '@/stores'
import SkeletonLoading from '@/components/SkeletonLoading.vue'
import LoadingButton from '@/components/LoadingButton.vue'

const { addErrorToast, addSuccessToast } = useToastStore()
const { address: currentAddress } = useUserDataStore()

const props = defineProps<{
  action: Action
  team: Partial<Team>
  boardOfDirectors: Address[]
}>()
const emits = defineEmits(['closeModal'])

const {
  data: approvers,
  isLoading: approversLoading,
  error: approversError
} = useReadContract({
  abi: BOD_ABI,
  address: props.team.boardOfDirectorsAddress! as Address,
  functionName: 'getActionApprovers',
  args: [props.action.id]
})

const { data: isApproved, error: isApprovedError } = useReadContract({
  abi: BOD_ABI,
  address: props.team.boardOfDirectorsAddress! as Address,
  functionName: 'actionApprovals',
  args: [props.action.id, currentAddress as Address]
})

const { data: hash, status, writeContractAsync } = useWriteContract()
const {
  isLoading: isConfirming,
  error: confirmError,
  isSuccess
} = useWaitForTransactionReceipt({
  hash
})
const approveAction = async () => {
  await writeContractAsync({
    abi: BOD_ABI,
    address: props.team.boardOfDirectorsAddress! as Address,
    functionName: 'approve',
    args: [props.action.id]
  })
}
const revokeAction = async () => {
  await writeContractAsync({
    abi: BOD_ABI,
    address: props.team.boardOfDirectorsAddress! as Address,
    functionName: 'revoke',
    args: [props.action.id]
  })
}

watch(approversError, () => {
  if (approversError.value) {
    addErrorToast('Failed to fetch approvers')
  }
})
watch(isApprovedError, () => {
  if (isApprovedError.value) {
    addErrorToast('Failed to fetch approval status')
  }
})
// watch(isSuccess, () => {
//   if (isSuccess.value) {
//     addSuccessToast(`Action ${isApproved ? 'revoked' : 'approved'}   successfully`)
//     emits('closeModal')
//   }
// })
// watch(status, () => {
//   if (status.value === 'error') {
//     addErrorToast(`Failed to ${isApproved ? 'revoke' : 'approve'} transaction`)
//   }
// })
// watch(confirmError, () => {
//   if (confirmError.value) {
//     addErrorToast(`Failed to ${isApproved ? 'revoke' : 'approve'} transaction`)
//   }
// })
</script>
