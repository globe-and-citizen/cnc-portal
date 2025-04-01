<template>
  <table class="table table-zebra text-center border border-solid">
    <thead>
      <tr class="table-row-border">
        <th>No</th>
        <th>Target</th>
        <th>Description</th>
        <th>Executed</th>
        <th>Function Signature</th>
      </tr>
    </thead>
    <tbody>
      <tr v-if="actionCount == 0">
        <td class="text-center font-bold text-lg h-96" colspan="6" rowspan="10">No actions</td>
      </tr>
      <tr
        v-else
        class="hover cursor-pointer"
        v-for="(action, index) in actions"
        :key="index"
        @click="
          () => {
            selectedAction = action
            approveModal = true
          }
        "
      >
        <th>{{ index + 1 }}</th>
        <td>{{ action.targetAddress }}</td>
        <td>{{ action.description }}</td>
        <td>{{ action.isExecuted }}</td>
        <td>{{ action.data.slice(0, 10) }}...</td>
      </tr>
    </tbody>
  </table>
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
