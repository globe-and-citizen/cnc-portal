<template>
  <div
    class="collapse-arrow collapse static border"
    :class="`${currentTeam?.ownerAddress == address ? 'bg-green-100' : 'bg-blue-100'}`"
  >
    <input type="checkbox" />
    <div class="collapse-title text-xl font-medium">
      <div class="flex items-center justify-center">
        <h2 class="pl-5">{{ currentTeam?.name }}</h2>
        <div
          class="badge badge-lg badge-primary ml-2 flex items-center justify-center"
          v-if="currentTeam?.ownerAddress == address"
        >
          Owner
        </div>
        <div class="badge badge-sm badge-secondary ml-2" v-else>Employee</div>
      </div>
    </div>
    <div class="collapse-content">
      <p class="pl-5">{{ currentTeam?.description }}</p>

      <div class="mt-5 flex flex-row items-center justify-center gap-2 pl-5">
        <ButtonUI
          size="sm"
          variant="secondary"
          v-if="currentTeam?.ownerAddress == address"
          @click="emits('updateTeamModalOpen')"
        >
          Update
        </ButtonUI>
        <ButtonUI
          size="sm"
          variant="error"
          v-if="currentTeam?.ownerAddress == address"
          @click="emits('deleteTeam')"
        >
          Delete
        </ButtonUI>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import ButtonUI from '@/components/ButtonUI.vue'
import { useTeamStore } from '@/stores'
import { useUserDataStore } from '@/stores/user'
import { storeToRefs } from 'pinia'

const { address } = useUserDataStore()

const emits = defineEmits(['updateTeamModalOpen', 'deleteTeam'])
const teamStore = useTeamStore()
const { currentTeam } = storeToRefs(teamStore)
</script>
