<template>
  <div
    class="collapse collapse-arrow border"
    :class="`${team.ownerAddress == address ? 'bg-green-100' : 'bg-blue-100'}`"
  >
    <input type="checkbox" />
    <div class="collapse-title text-xl font-medium">
      <div class="flex items-center justify-center">
        <h2 class="pl-5">{{ team.name }}</h2>
        <div
          class="badge badge-sm badge-primary flex items-center justify-center ml-2"
          v-if="team.ownerAddress == address"
        >
          Owner
        </div>
        <div class="badge badge-sm badge-secondary ml-2" v-else>Employee</div>
      </div>
    </div>
    <div class="collapse-content">
      <p class="pl-5">{{ team.description }}</p>

      <div class="pl-5 flex flex-row justify-center gap-2 mt-5 items-center">
        <button
          class="btn btn-secondary btn-sm"
          v-if="team.ownerAddress == address"
          @click="emits('updateTeamModalOpen')"
        >
          Update
        </button>
        <button
          class="btn btn-error btn-sm"
          v-if="team.ownerAddress == address"
          @click="emits('deleteTeam')"
        >
          Delete
        </button>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { useUserDataStore } from '@/stores/user'
import type { Team } from '@/types'

const { address } = useUserDataStore()

const emits = defineEmits(['updateTeamModalOpen', 'deleteTeam'])
defineProps<{
  team: Partial<Team>
}>()
</script>
