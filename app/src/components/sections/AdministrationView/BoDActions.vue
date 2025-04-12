<template>
  <SkeletonLoading v-if="pendingActionLoading || executedActionsLoading" class="w-full h-48" />
  <div v-else class="flex flex-col gap-4">
    <h2 class="text-center">Actions</h2>
    <div id="bod-actions" class="overflow-x-auto flex flex-col gap-4">
      <TabNavigation v-model="activeTab" :tabs="tabs" class="w-full">
        <template #tab-0 v-if="isPending"
          ><ActionTable
            :actions="pendingActions?.data ?? []"
            :actionCount="pendingActions?.total ?? 0"
            :board-of-directors="boardOfDirectors"
            :team="team"
            @refetch="async () => await fetchPendingActions()"
        /></template>
        <template #tab-1 v-if="!isPending"
          ><ActionTable
            :actions="executedActions?.data ?? []"
            :actionCount="executedActions?.total ?? 0"
            :board-of-directors="boardOfDirectors"
            :team="team"
            @refetch="async () => await fetchExecutedActions()"
        /></template>
      </TabNavigation>
      <div class="flex justify-center join">
        <ButtonUI
          class="join-item"
          :class="{
            'btn-disabled': currentCount == 0 || page == 1
          }"
          @click="() => (page -= 1)"
        >
          «
        </ButtonUI>
        <ButtonUI class="join-item">Page {{ page }}</ButtonUI>
        <ButtonUI
          class="join-item"
          :class="{
            'btn-disabled': currentCount <= page * limit || currentCount == 0
          }"
          @click="() => (page += 1)"
        >
          »
        </ButtonUI>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import TabNavigation from '@/components/TabNavigation.vue'
import ActionTable from '@/components/sections/AdministrationView/tables/ActionTable.vue'
import SkeletonLoading from '@/components/SkeletonLoading.vue'
import type { ActionResponse, Team } from '@/types'
import type { Address } from 'viem'
import { ref, watch, computed, onMounted } from 'vue'
import { useCustomFetch } from '@/composables/useCustomFetch'
import { useAddAction } from '@/composables/bod'
import { useToastStore } from '@/stores/useToastStore'
import ButtonUI from '@/components/ButtonUI.vue'

const activeTab = ref(0)
const tabs = ['Pending', 'Executed']
const props = defineProps<{
  team: Partial<Team>
  boardOfDirectors: Address[]
}>()
const { addSuccessToast, addErrorToast } = useToastStore()

const page = ref(1)
const limit = ref<number>(10)
const actionModal = ref(false)
const getActionsUrl = ref('actions')

const { error: errorAddAction, isSuccess: addActionsSuccess } = useAddAction()

const {
  isFetching: pendingActionLoading,
  error: errorPendingActions,
  execute: fetchPendingActions,
  data: pendingActions
} = useCustomFetch<ActionResponse>(`actions`, {
  immediate: false,
  beforeFetch: ({ options, url }) => {
    const params = new URLSearchParams()
    params.append('teamId', props.team.id?.toString() ?? '')
    params.append('page', page.value?.toString() ?? '1')
    params.append('take', limit.value?.toString() ?? '10')
    params.append('isExecuted', 'false')
    url += `?${params.toString()}`

    return { options, url }
  }
})
  .get()
  .json()

const {
  isFetching: executedActionsLoading,
  error: errorExecutedActions,
  execute: fetchExecutedActions,
  data: executedActions
} = useCustomFetch<ActionResponse>(`actions`, {
  immediate: false,
  beforeFetch: ({ options, url }) => {
    const params = new URLSearchParams()
    params.append('teamId', props.team.id?.toString() ?? '')
    params.append('page', page.value?.toString() ?? '1')
    params.append('take', limit.value?.toString() ?? '10')
    params.append('isExecuted', 'true')
    url += `?${params.toString()}`

    return { options, url }
  }
})
  .get()
  .json()

const isPending = computed(() => activeTab.value === 0)
const currentCount = computed(
  () => (isPending.value ? pendingActions.value?.total : executedActions.value?.total) ?? 0
)

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
watch(isPending, async () => {
  page.value = 1
  const params = new URLSearchParams()
  params.append('teamId', props.team.id?.toString() ?? '')
  params.append('page', page.value?.toString() ?? '1')
  params.append('take', limit.value?.toString() ?? '10')
  if (isPending.value) {
    params.append('isExecuted', 'false')
    getActionsUrl.value = `actions?${params.toString()}`
    await fetchPendingActions()
  } else {
    params.append('isExecuted', 'true')
    getActionsUrl.value = `actions?${params.toString()}`
    await fetchExecutedActions()
  }
})
watch(page, async () => {
  const params = new URLSearchParams()
  params.append('teamId', props.team.id?.toString() ?? '')
  params.append('page', page.value?.toString() ?? '1')
  params.append('take', limit.value?.toString() ?? '10')
  if (isPending.value) {
    params.append('isExecuted', 'false')
    getActionsUrl.value = `actions?${params.toString()}`
    await fetchPendingActions()
  } else {
    params.append('isExecuted', 'true')
    getActionsUrl.value = `actions?${params.toString()}`
    await fetchExecutedActions()
  }
})
watch(errorAddAction, () => {
  if (errorAddAction.value) {
    addErrorToast('Failed to add action')
  }
})
watch(addActionsSuccess, () => {
  if (addActionsSuccess.value) {
    addSuccessToast('Action added')
    actionModal.value = false
  }
})

onMounted(async () => {
  await fetchPendingActions()
})
</script>
