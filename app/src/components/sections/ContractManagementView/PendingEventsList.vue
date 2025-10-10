<template>
  <span class="text-lg font-semibold">Pending Actions</span>
  <TableComponent :rows="notExecutedActions" :columns="columns">
    <template #index-data="{ row }">
      {{ row.actionId }}
    </template>
    <template #description-data="{ row }">
      {{ row.description }}
    </template>

    <template #requestedBy-data="{ row }">
      <UserComponent :user="row.requestedBy" />
    </template>

    <template #dateCreated-data="{ row }">
      {{ row.dateCreated }}
    </template>

    <template #actions-data="{ row }">
      <ButtonUI @click="emits('view-details', row)" variant="success" size="sm">Approve</ButtonUI>
    </template>
  </TableComponent>
</template>
<script setup lang="ts">
import TableComponent from '@/components/TableComponent.vue'
import ButtonUI from '@/components/ButtonUI.vue'
import type { FormattedAction } from '@/utils'
import UserComponent from '@/components/UserComponent.vue'
import { useBodReads } from '@/composables/bod/reads'
const { useBodIsActionExecuted } = useBodReads()
import { computed } from 'vue'

const emits = defineEmits(['view-details'])

const props = defineProps<{ pendingActions: FormattedAction }>()

const readers = props.pendingActions.map((a) => ({
  action: a,
  executed: useBodIsActionExecuted(a.actionId).data
}))
//filter out executed actions
const notExecutedActions = computed(() =>
  readers.reduce(
    (acc, r) => {
      if (r.executed?.value === false) {
        acc.push(r.action)
      }
      return acc
    },
    [] as (typeof readers)[0]['action'][]
  )
)

const columns = [
  { key: 'index', label: '#' },
  { key: 'description', label: 'Description' },
  { key: 'requestedBy', label: 'Requested By' },
  { key: 'dateCreated', label: 'Date Created' },
  { key: 'actions', label: 'Actions' }
]
</script>
