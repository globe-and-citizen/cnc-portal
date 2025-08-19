<template>
  <span class="text-lg font-semibold">Pending Actions</span>
  <TableComponent :rows="pendingActions" :columns="columns">
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
import { ref } from 'vue'
import TableComponent from '@/components/TableComponent.vue'
import ButtonUI from '@/components/ButtonUI.vue'
import type { FormattedAction } from '@/utils'
import UserComponent from '@/components/UserComponent.vue'

const emits = defineEmits(['view-details'])

defineProps<{ pendingActions: FormattedAction }>()

// const pendingEvents = ref([
//   {
//     index: 1,
//     description: 'Transfer ownership to BOD',
//     requestedBy: 'User1',
//     dateCreated: '2023-01-01'
//   },
//   {
//     index: 2,
//     description: 'Transfer ownership to Member',
//     requestedBy: 'User2',
//     dateCreated: '2023-01-02'
//   },
//   {
//     index: 3,
//     description: 'Transfer ownership to BOD',
//     requestedBy: 'User3',
//     dateCreated: '2023-01-03'
//   },
//   { index: 3, description: 'Transfer from bank', requestedBy: 'User3', dateCreated: '2023-01-03' }
// ])

const columns = [
  { key: 'index', label: '#' },
  { key: 'description', label: 'Description' },
  { key: 'requestedBy', label: 'Requested By' },
  { key: 'dateCreated', label: 'Date Created' },
  { key: 'actions', label: 'Actions' }
]
</script>
