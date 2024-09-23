<template>
  <div class="flex flex-col">
    <h3 class="text-xl font-bold">Manage deployments</h3>
    <hr />

    <div class="flex items-center justify-center mt-4">
      <button class="btn btn-primary btn-sm" v-if="!team?.officerAddress">
        Create Officer Contract
      </button>
      <div v-else></div>
    </div>
  </div>
</template>
<script setup lang="ts">
import type { Team } from '@/types'

defineProps<{
  team: Partial<Team>
}>()
</script>
