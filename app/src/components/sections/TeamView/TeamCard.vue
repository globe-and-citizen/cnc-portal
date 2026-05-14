<template>
  <div
    class="card h-36 w-80 border"
    :class="[team.ownerAddress == userStore.address ? 'bg-green-100' : 'bg-blue-100']"
  >
    <div class="card-body">
      <div class="flex flex-row items-start justify-between">
        <h1 class="card-title text-md overflow-hidden">
          {{ props.team.name }}
        </h1>
        <UBadge
          size="sm"
          color="primary"
          variant="solid"
          v-if="team.ownerAddress == userStore.address"
        >
          Owner
        </UBadge>
        <UBadge size="sm" color="secondary" variant="solid" v-else>Employee</UBadge>
      </div>
      <div>
        <p class="line-clamp-3 text-xs">{{ props.team.description }}</p>
      </div>
      <div class="card-actions mt-auto justify-between">
        <div class="flex items-center gap-1">
          <UBadge
            v-if="isHidden"
            label="Hidden"
            icon="i-tabler-eye-off"
            color="success"
            variant="soft"
            size="sm"
          />
          <UBadge
            v-if="isArchived"
            label="Archived"
            icon="i-tabler-archive"
            color="warning"
            variant="soft"
            size="sm"
          />
        </div>
      </div>
    </div>
    <div>
      <p class="line-clamp-3 text-xs">{{ props.team.description }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useUserDataStore } from '@/stores/user'
import type { Team } from '@/types'

interface Props {
  team: Team
}
const userStore = useUserDataStore()
const props = defineProps<Props>()
const isHidden = computed(() => props.team.isHidden)
const isArchived = computed(() => props.team.isArchived)
</script>
