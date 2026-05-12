<template>
  <div class="flex w-full justify-between gap-5">
    <div
      class="collapse-arrow collapse static border"
      :class="`${isOwner ? 'bg-green-100' : 'bg-blue-100'}`"
    >
      <input type="checkbox" />
      <div class="collapse-title text-xl font-medium">
        <div class="flex items-center justify-center">
          <h2 class="pl-5">{{ currentTeam?.name }}</h2>
          <div
            class="badge badge-lg badge-primary ml-2 flex items-center justify-center"
            v-if="isOwner"
          >
            Owner
          </div>
          <div class="badge badge-sm badge-secondary ml-2" v-else>Employee</div>
        </div>
      </div>
      <div class="collapse-content">
        <p class="pl-5">{{ currentTeam?.description }}</p>
        <div class="mt-5 flex flex-row items-center justify-center gap-2 pl-5">
          <TeamMetaUpdateModal v-if="isOwner" />
          <TeamMetaArchiveModal v-if="isOwner" :current-team="currentTeam" />
          <TeamMetaVisibilityModal :current-team="currentTeam" />
          <TeamMetaDeleteModal v-if="isOwner" :current-team="currentTeam" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useTeamStore } from '@/stores'
import { useUserDataStore } from '@/stores/user'
import TeamMetaArchiveModal from './TeamMetaArchiveModal.vue'
import TeamMetaDeleteModal from './TeamMetaDeleteModal.vue'
import TeamMetaUpdateModal from './TeamMetaUpdateModal.vue'
import TeamMetaVisibilityModal from './TeamMetaVisibilityModal.vue'

const teamStore = useTeamStore()
const currentTeam = computed(() => teamStore.currentTeamMeta.data)
const { address } = useUserDataStore()
const isOwner = computed(() => currentTeam.value?.ownerAddress === address)
</script>
