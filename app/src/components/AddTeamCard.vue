<template>
  <div class="card w-80 bg-white flex justify-center items-center">
    <div class="card-body flex justify-center items-center">
      <h1 class="card-title">Add Team</h1>

      <div class="w-6 h-6 cursor-pointer" @click="emits('toggleAddTeamModal')">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="lightgreen"
          viewBox="0 0 24 24"
          strokeWidth="{10.5}"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
          />
        </svg>
      </div>
    </div>
  </div>
  <AddTeamModal
    :team="team"
    :showAddTeamModal="showAddTeamModal"
    @updateAddTeamModal="(newFormDataTeam) => emits('updateAddTeamModal', newFormDataTeam)"
    @addInput="emits('addInput')"
    @removeInput="emits('removeInput')"
    @addTeam="emits('addTeam')"
    @toggleAddTeamModal="emits('toggleAddTeamModal')"
  />
</template>

<script setup lang="ts">
import type { TeamInput } from '@/types/types'
import { ref, watch } from 'vue'
import AddTeamModal from '@/components/modals/AddTeamModal.vue'

const emits = defineEmits([
  'addTeam',
  'addInput',
  'removeInput',
  'toggleAddTeamModal',
  'updateAddTeamModal'
])
const props = defineProps<{
  showAddTeamModal: boolean
  team: TeamInput
}>()
const team = ref(props.team)
const showAddTeamModal = ref<boolean>(props.showAddTeamModal)

watch(
  [() => props.showAddTeamModal, team, showAddTeamModal],
  ([newshowAddTeamModal, newFormDataTeam]) => {
    emits('updateAddTeamModal', newFormDataTeam)
    showAddTeamModal.value = newshowAddTeamModal
  },
  { deep: true }
)
</script>
