<template>
  <UCard
    class="flex h-36 w-80 flex-col border"
    :class="[team.ownerAddress == userStore.address ? 'bg-green-100' : 'bg-blue-100']"
  >
    <div class="flex min-h-0 flex-1 flex-col gap-2">
      <div class="flex flex-row items-start justify-between">
        <h1 class="text-md overflow-hidden font-semibold">
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
      <div class="min-h-0 flex-1">
        <p class="line-clamp-3 text-xs">{{ props.team.description }}</p>
      </div>
      <div class="mt-auto flex justify-between">
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
          <UBadge
            v-if="isOnLegacyContracts"
            label="Legacy"
            icon="i-lucide-triangle-alert"
            color="warning"
            variant="soft"
            size="sm"
            data-test="team-legacy-badge"
          />
        </div>
      </div>
    </div>
  </UCard>
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
// Legacy = an Officer is deployed but on an older contract generation. Gate on
// the Officer existing so onboarding teams (isMigrated false, no Officer) don't
// get flagged.
const isOnLegacyContracts = computed(
  () => !!props.team.currentOfficer?.address && props.team.isMigrated === false
)
</script>
