<template>
  <div class="p-4 flex gap-4 border-b-2 items-center text-sm">
    <p class="text-xl font-black w-11 h-11 bg-red-200 flex items-center justify-center rounded-lg">
      {{ team.name.charAt(0) }}
    </p>
    <div class="pr-8">
      <p class="min-w-max font-semibold">{{ team.name }}</p>
      <p class="min-w-max text-slate-400">{{ team._count.members }} Team Members</p>
    </div>
    <IconifyIcon icon="heroicons-solid:check" class="size-6" v-if="isSelected" />
  </div>
</template>

<script setup lang="ts">
import { Icon as IconifyIcon } from '@iconify/vue'
import type { Team } from '@/types'

defineProps<{
  team: Team & { _count: { members: number } }
  isSelected: boolean
}>()
</script>
