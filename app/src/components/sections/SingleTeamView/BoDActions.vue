<template>
  <SkeletonLoading
    v-if="
      pendingActionLoading ||
      pendingActionsCountLoading ||
      executedActionsLoading ||
      executedActionsCountLoading
    "
    class="w-full h-48"
  />
  <div v-else class="flex flex-col gap-4">
    <h2 class="text-center">Actions</h2>
    <div id="bod-actions" class="overflow-x-auto flex flex-col gap-4">
      <TabNavigation v-model="activeTab" :tabs="tabs" class="w-full">
        <template #tab-0 v-if="isPending"
          ><ActionTable
            :actions="pendingActions ?? []"
            :actionCount="pendingActionsCount ?? BigInt(0)"
            :board-of-directors="boardOfDirectors"
            :team="team"
            @refetch="fetchPendingActionsCount()"
        /></template>
        <template #tab-1 v-if="!isPending"
          ><ActionTable
            :actions="exectuedActions ?? []"
            :actionCount="executedActionsCount ?? BigInt(0)"
            :board-of-directors="boardOfDirectors as Address[]"
            :team="team"
            @refetch="fetchPendingActionsCount()"
        /></template>
      </TabNavigation>
      <div class="flex justify-center join">
        <button
          class="join-item btn"
          :class="{
            'btn-disabled':
              (isPending ? pendingActionsCount == BigInt(0) : executedActionsCount == BigInt(0)) ||
              page == 1
          }"
          @click="
            () => {
              page -= 1
              startIndex = BigInt((page - 1) * 1)
              isPending
                ? fetchPendingActions(startIndex, limit)
                : fetchExecutedActions(startIndex, limit)
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
              currentCount.value == BigInt(0) ||
              BigInt(page) * limit >= (currentCount.value ?? BigInt(0)) / limit
          }"
          @click="
            () => {
              page += 1
              startIndex = BigInt((page - 1) * 1)
              isPending
                ? fetchPendingActions(startIndex, limit)
                : fetchExecutedActions(startIndex, limit)
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
import TabNavigation from '@/components/TabNavigation.vue'
import ActionTable from '@/components/sections/SingleTeamView/tables/ActionTable.vue'
import SkeletonLoading from '@/components/SkeletonLoading.vue'
import ModalComponent from '@/components/ModalComponent.vue'
import AddActionForm from '@/components/sections/SingleTeamView/forms/AddActionForm.vue'
import { BOD_ABI } from '@/artifacts/abi/bod'
import type { Team } from '@/types'
import { useWriteContract } from '@wagmi/vue'
import type { Address } from 'viem'
import { ref, watch, computed, onMounted } from 'vue'
import { useToastStore } from '@/stores/useToastStore'
import { useGetActions, useGetActionsCount } from '@/composables/bod'
import type { Action } from '@/types'

const activeTab = ref(0)
const tabs = ['Pending', 'Executed']
const props = defineProps<{
  team: Partial<Team>
  boardOfDirectors: Address[]
}>()
const { addSuccessToast, addErrorToast } = useToastStore()

const page = ref(1)
const startIndex = ref<bigint | null>(null)
const limit = ref<bigint>(BigInt(10))
const actionModal = ref(false)
const { writeContract, status: addStatus, error: addError } = useWriteContract()

const {
  data: pendingActionsCount,
  isLoading: pendingActionsCountLoading,
  error: pendingActionsCountError,
  execute: fetchPendingActionsCount
} = useGetActionsCount(props.team.boardOfDirectorsAddress!)

const {
  data: executedActionsCount,
  isLoading: executedActionsCountLoading,
  error: executedActionsCountError,
  execute: fetchExecutedActionsCount
} = useGetActionsCount(props.team.boardOfDirectorsAddress!, false)

const {
  data: pendingActions,
  isLoading: pendingActionLoading,
  error: errorPendingActions,
  execute: fetchPendingActions
} = useGetActions(props.team.boardOfDirectorsAddress!)

const {
  data: exectuedActions,
  isLoading: executedActionsLoading,
  error: errorExecutedActions,
  execute: fetchExecutedActions
} = useGetActions(props.team.boardOfDirectorsAddress!, false)

const addAction = (action: Partial<Action>) => {
  writeContract({
    abi: BOD_ABI,
    address: props.team.boardOfDirectorsAddress as Address,
    functionName: 'addAction',
    args: [action.target!, action.description!, action.data as Address]
  })
}

const isPending = computed(() => activeTab.value === 0)
const currentCount = computed(
  () => (isPending.value ? pendingActionsCount : executedActionsCount) ?? BigInt(0)
)

watch(pendingActionsCount, () => {
  if ((pendingActionsCount.value ?? BigInt(0)) > BigInt(0)) {
    startIndex.value = BigInt(0)
    fetchPendingActions(startIndex.value, limit.value)
  }
})
watch(executedActionsCount, () => {
  if ((executedActionsCount.value ?? BigInt(0)) > BigInt(0)) {
    startIndex.value = BigInt(0)
    fetchExecutedActions(startIndex.value, limit.value)
  }
})
watch(pendingActionsCountError, () => {
  if (pendingActionsCountError.value) {
    addErrorToast('Failed to get pending actions')
    startIndex.value = null
  }
})
watch(executedActionsCountError, () => {
  if (executedActionsCountError.value) {
    addErrorToast('Failed to get executed actions')
    startIndex.value = null
  }
})
watch(addStatus, () => {
  if (addStatus.value === 'success') {
    actionModal.value = false
    fetchPendingActionsCount()
    addSuccessToast('Action added successfully')
  }
})
watch(errorPendingActions, () => {
  if (errorPendingActions.value) {
    addErrorToast('Failed to get actions')
  }
})
watch(errorExecutedActions, () => {
  if (errorExecutedActions.value) {
    addErrorToast('Failed to get actions')
  }
})
watch(addError, () => {
  if (addError.value) {
    addErrorToast(addError.value.message)
  }
})
watch(isPending, () => {
  page.value = 1
  if (isPending.value) {
    fetchPendingActionsCount()
  } else {
    fetchExecutedActionsCount()
  }
})

onMounted(() => {
  fetchPendingActionsCount()
})
</script>
