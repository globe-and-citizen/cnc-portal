<template>
  <!-- Navigation and breadcrumb -->
  <div class="flex flex-col gap-6" v-if="teamStore.currentTeamMeta">
    <div>
      <h2>{{ route.meta.name }}</h2>
      <div class="breadcrumbs text-sm" v-if="teamStore.currentTeamMeta.teamError">
        <ul>
          <li>
            <div class="skeleton h-4 w-20" v-if="teamStore.currentTeamMeta.teamIsFetching"></div>
            <a v-if="teamStore.currentTeamMeta.team">{{ teamStore.currentTeamMeta.team?.name }}</a>
          </li>

          <li>{{ route.meta.name }}</li>
        </ul>
      </div>
    </div>
    <div v-if="teamStore.currentTeamMeta.teamError">
      <div class="alert alert-warning" v-if="teamStore.currentTeamMeta.statusCode === 404">
        Error! Team not found
      </div>
      <div class="alert alert-error" v-else>Error! Something went wrong</div>
    </div>
    <div v-if="route.name == 'show-team' && teamStore.currentTeamMeta?.team">
      <TeamMeta
        :team="teamStore.currentTeamMeta.team"
        @getTeam="teamStore.currentTeamMeta.executeFetchTeam"
      />
      <MemberSection
        :team="teamStore.currentTeamMeta.team"
        :teamIsFetching="teamStore.currentTeamMeta.teamIsFetching"
        @getTeam="teamStore.currentTeamMeta.executeFetchTeams"
      />
    </div>
    <RouterView v-if="teamStore.currentTeam" />
  </div>
</template>
<script setup lang="ts">
import { useTeamStore } from '@/stores/teamStore'
import { watch } from 'vue'
import { onMounted } from 'vue'
import { useRoute } from 'vue-router'
import MemberSection from '@/components/sections/SingleTeamView/MemberSection.vue'
import TeamMeta from '@/components/sections/SingleTeamView/TeamMetaSection.vue'
const teamStore = useTeamStore()

const route = useRoute()

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
