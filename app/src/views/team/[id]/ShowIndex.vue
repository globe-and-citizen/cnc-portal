<template>
  <!-- Navigation and breadcrumb -->
  <div class="flex flex-col gap-6">
    <div>
      <h2>{{ route.meta.name }}</h2>
      <div class="breadcrumbs text-sm">
        <ul>
          <li>
            <a v-if="teamStore.currentTeam">{{ teamStore.currentTeam?.name }}</a>
            <div class="skeleton h-4 w-20" v-else></div>
          </li>

          <li>{{ route.meta.name }}</li>
        </ul>
      </div>
    </div>
    <router-view />
  </div>
</template>
<script setup lang="ts">
import { useTeamStore } from '@/stores/teamStore'
import { watch } from 'fs'
import { computed, onMounted, onUpdated, watchEffect } from 'vue'
import { useRoute, useRouter } from 'vue-router'
const teamStore = useTeamStore()

const router = useRouter()
const route = useRoute()

onMounted(() => {
  console.log('Mounted')
  teamStore.setCurrentTeamId(route.params.id as string)
})
</script>
<style>
* {
  /* border: 1px solid red; */
}
</style>
