<template>
  <div class="flex items-center gap-4 border-b-2 p-4 text-sm">
    <p class="flex h-11 w-11 items-center justify-center rounded-lg bg-red-200 text-xl font-black">
      {{ team.name.charAt(0) }}
    </p>
    <div class="pr-8">
      <p class="min-w-max font-semibold">{{ team.name }}</p>
      <p class="min-w-max text-slate-400">{{ memberCount }} Team Members</p>
    </div>
    <IconifyIcon icon="heroicons-solid:check" class="size-6" v-if="isSelected" />
  </div>
</template>

<script setup lang="ts">
import { Icon as IconifyIcon } from '@iconify/vue'
import type { Team } from '@/types'
import { computed } from 'vue'

const props = defineProps<{
  team: Team
  isSelected: boolean
}>()

const memberCount = computed(() => {
  // Prefer _count if available from backend, fallback to array length
  return props.team._count?.members ?? props.team.members?.length ?? 0
})
</script>
