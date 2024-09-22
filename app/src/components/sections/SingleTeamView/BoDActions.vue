<template>
  <SkeletonLoading v-if="actionLoading || actionCountLoading" class="w-full h-48" />
  <div v-else class="flex flex-col gap-4">
    <h2 class="text-center">Actions</h2>
    <div id="bod-actions" class="overflow-x-auto flex flex-col gap-4">
      <table class="table table-zebra text-center border border-solid">
        <thead>
          <tr class="table-row-border">
            <th>No</th>
            <th>Target</th>
            <th>Description</th>
            <th>Approval Count</th>
            <th>Executed</th>
            <th>Function Signature</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="actionCount == BigInt(0)">
            <td class="text-center font-bold text-lg h-96" colspan="6" rowspan="10">No actions</td>
          </tr>
          <tr v-else class="hover cursor-pointer" v-for="(action, index) in actions" :key="index">
            <th>{{ index + 1 }}</th>
            <td>{{ action.target }}</td>
            <td>{{ action.description }}</td>
            <td>{{ action.approvalCount }}</td>
            <td>{{ action.isExecuted }}</td>
            <td>{{ action.data.slice(0, 10) }}...</td>
          </tr>
        </tbody>
      </table>
      <div class="flex justify-center join">
        <button
          class="join-item btn"
          :class="{ 'btn-disabled': actionCount == BigInt(0) || page == 1 }"
          @click="
            () => {
              page -= 1
              startIndex = BigInt((page - 1) * 1)
              fetchActions(startIndex, limit)
            }
          "
        >
          «
        </button>
        <button class="join-item btn">Page {{ page }}</button>
        <button
          class="join-item btn"
          :class="{
            'btn-disabled':
              actionCount == BigInt(0) || BigInt(page) * limit >= (actionCount ?? BigInt(0)) / limit
          }"
          @click="
            () => {
              page += 1
              startIndex = BigInt((page - 1) * 1)
              fetchActions(startIndex, limit)
            }
          "
        >
          »
        </button>
      </div>
    </div>
    <div class="flex flex-col w-full">
      <div class="flex justify-end">
        <button class="btn btn-primary w-40" @click="actionModal = true">Add action</button>
      </div>
    </div>
  </div>
  <ModalComponent v-model="actionModal">
    <AddActionForm
      v-if="actionModal"
      @addAction="(action: Partial<Action>) => addAction(action)"
      :loading="addStatus == 'pending'"
      :team="team"
    />
  </ModalComponent>
</template>
<script setup lang="ts">
import SkeletonLoading from '@/components/SkeletonLoading.vue'
import ModalComponent from '@/components/ModalComponent.vue'
import AddActionForm from '@/components/sections/SingleTeamView/forms/AddActionForm.vue'
import { BOD_ABI } from '@/artifacts/abi/bod'
import type { Team } from '@/types'
import { useReadContract, useWriteContract } from '@wagmi/vue'
import type { Address } from 'viem'
import { ref, watch } from 'vue'
import { useToastStore } from '@/stores/useToastStore'
import { useGetActions } from '@/composables/bod'
import type { Action } from '@/types'

const props = defineProps<{
  team: Partial<Team>
  boardOfDirectors: readonly Address[]
}>()
const { addSuccessToast, addErrorToast } = useToastStore()

const page = ref(1)
const startIndex = ref<bigint | null>(null)
const limit = ref<bigint>(BigInt(10))
const actionModal = ref(false)
const { writeContract, status: addStatus, error: addError } = useWriteContract()

const {
  data: actionCount,
  error: errorActionCount,
  isLoading: actionCountLoading,
  refetch: refetchActionCount
} = useReadContract({
  abi: BOD_ABI,
  address: props.team.boardOfDirectorsAddress as Address,
  functionName: 'actionCount'
})

const {
  data: actions,
  isLoading: actionLoading,
  error: errorActions,
  execute: fetchActions
} = useGetActions(props.team.boardOfDirectorsAddress!)

const addAction = (action: Partial<Action>) => {
  writeContract({
    abi: BOD_ABI,
    address: props.team.boardOfDirectorsAddress as Address,
    functionName: 'addAction',
    args: [action.target!, action.description!, action.data as Address]
  })
}

watch(actionCount, () => {
  if ((actionCount.value ?? BigInt(0)) > BigInt(0)) {
    startIndex.value = BigInt(0)
    fetchActions(startIndex.value, limit.value)
  }
})
watch(errorActionCount, () => {
  if (errorActionCount.value) {
    addErrorToast(errorActionCount.value.message)
    startIndex.value = null
  }
})
watch(addStatus, () => {
  if (addStatus.value === 'success') {
    actionModal.value = false
    refetchActionCount()
    addSuccessToast('Action added successfully')
  }
})
watch(errorActions, () => {
  if (errorActions.value) {
    addErrorToast('Failed to get actions')
  }
})
watch(addError, () => {
  if (addError.value) {
    addErrorToast(addError.value.message)
  }
})
</script>
