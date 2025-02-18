<template>
  <!-- Navigation and breadcrumb -->
  <div class="flex flex-col gap-6">
    <div>
      <h2>{{ route.meta.name }}</h2>
      <div class="breadcrumbs text-sm" v-if="!teamError">
        <ul>
          <li>
            <div class="skeleton h-4 w-20" v-if="teamIsFetching"></div>
            <a v-if="team">{{ team?.name }}</a>
          </li>

          <li>{{ route.meta.name }}</li>
        </ul>
      </div>
    </div>
    <div v-if="teamError">
      <div class="alert alert-warning" v-if="statusCode === 404">Error! Team not found</div>
      <div class="alert alert-error" v-else>Error! Something went wrong</div>
    </div>
    <RouterView v-if="team" />
  </div>
</template>
<script setup lang="ts">
import { useTeamStore } from '@/stores/teamStore'
import { watch, computed } from 'vue'
import { onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useCustomFetch } from '@/composables/useCustomFetch'
const teamStore = useTeamStore()

const route = useRoute()

const teamURI = computed(() => {
  console.log('Route params', route.params.id)
  return `teams/${route.params.id}`
})

/**
 * @description Fetch team by id
 * @returns team, teamIsFetching, teamError, executeFetchTeam
 */
const {
  isFetching: teamIsFetching,
  error: teamError,
  statusCode,
  data: team
} = useCustomFetch(teamURI).json()

onMounted(() => {
  teamStore.setCurrentTeamId(route.params.id as string)
})

// Watch for changes in the route params then update the current team id
watch(
  () => route.params.id,
  (newId) => {
    if (newId !== teamStore.currentTeamId) {
      teamStore.setCurrentTeamId(newId as string)
    }
  }
)
</script>
<style></style>
