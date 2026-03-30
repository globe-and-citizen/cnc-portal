<template>
  <span class="text-lg font-semibold">Pending Actions</span>
  <UTable :data="notExecutedActions" :columns="columns">
    <template #actionId-cell="{ row: { original: row } }">
      {{ row.actionId }}
    </template>
    <template #description-cell="{ row: { original: row } }">
      {{ row.description }}
    </template>

    <template #requestedBy-cell="{ row: { original: row } }">
      <UserComponent :user="row.requestedBy" />
    </template>

    <template #dateCreated-cell="{ row: { original: row } }">
      {{ row.dateCreated }}
    </template>

    <template #actions-cell="{ row: { original: row } }">
      <UButton @click="emits('view-details', row)" color="success" size="sm" label="Approve" />
    </template>
  </UTable>
</template>
<script setup lang="ts">
import type { FormattedAction } from '@/utils'
import UserComponent from '@/components/UserComponent.vue'
import { useBodIsActionExecuted } from '@/composables/bod/reads'
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
  { accessorKey: 'actionId', header: '#' },
  { accessorKey: 'description', header: 'Description' },
  { accessorKey: 'requestedBy', header: 'Requested By' },
  { accessorKey: 'dateCreated', header: 'Date Created' },
  { accessorKey: 'actions', header: 'Actions' }
]
</script>
