<template>
  <TableComponent
    :rows="
      actions.map((action, index) => ({
        ...action,
        index: index + 1,
        functionSignature: action.data.slice(0, 10) + '...'
      }))
    "
    :columns="[
      { key: 'index', label: 'No' },
      { key: 'targetAddress', label: 'Target' },
      { key: 'description', label: 'Description' },
      { key: 'isExecuted', label: 'Executed' },
      { key: 'functionSignature', label: 'Function Signature' }
    ]"
    :loading="false"
    :emptyState="{
      label: 'No actions',
      icon: 'text-center font-bold text-lg h-96'
    }"
    @row-click="
      (row) => {
        selectedAction = row
        approveModal = true
      }
    "
  />
  <ModalComponent v-model="approveModal" v-if="approveModal">
    <ApproveRevokeAction
      :action="selectedAction!"
      :board-of-directors="boardOfDirectors"
      :team="team"
      @closeModal="approveModal = false"
      @on-executed="emits('refetch')"
    />
  </ModalComponent>
</template>

<script setup lang="ts">
import ModalComponent from '@/components/ModalComponent.vue'
import ApproveRevokeAction from '@/components/sections/AdministrationView/forms/ApproveRevokeAction.vue'
import type { Action, Team } from '@/types'
import type { Address } from 'viem'
import { ref } from 'vue'
import TableComponent from '@/components/TableComponent.vue'

const selectedAction = ref<Action | null>(null)
const approveModal = ref(false)

defineProps<{
  actionCount: number
  actions: Action[]
  team: Partial<Team>
  boardOfDirectors: Address[]
}>()
const emits = defineEmits(['refetch'])
</script>
