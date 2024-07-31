<template>
  <div
    class="card h-36 w-80 border"
    :class="`${team.ownerAddress == userStore.address ? 'bg-green-100' : 'bg-blue-100'}`"
  >
    <div class="card-body">
      <div class="flex flex-row justify-between items-start">
        <h1 class="card-title text-md overflow-hidden">
          {{ props.team.name }}
        </h1>
        <div
          class="badge badge-sm badge-primary"
          v-if="team.ownerAddress == userStore.address"
        >
          Owner
        </div>
        <div class="badge badge-sm badge-secondary" v-else>Employee</div>
      </div>
      <div>
        <p class="text-xs line-clamp-3">{{ props.team.description }}</p>
      </div>
      <div class="card-actions justify-between"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useUserDataStore } from '@/stores/user'
import type { Team } from '@/types'

interface Props {
  team: Team
}
const userStore = useUserDataStore()
const props = defineProps<Props>()
</script>
