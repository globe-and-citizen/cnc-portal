<template>
  <div class="flex flex-col gap-6">
    <div>
      <h2>{{ route.meta.name }}</h2>
    </div>
    <!-- Loader -->
    <div class="flex gap-3" data-test="loader" v-if="teamStore.teamsMeta.teamsAreFetching">
      <div class="flex w-1/4 flex-col gap-4" v-for="i in 4" :key="i">
        <div class="skeleton h-32 w-full"></div>
        <div class="skeleton h-4 w-28"></div>
        <div class="skeleton h-4 w-full"></div>
        <div class="skeleton h-4 w-full"></div>
      </div>
    </div>

    <!-- Empty team or Error -->
    <div
      class="flex flex-col items-center animate-fade-in"
      v-if="teamStore.teamsMeta.teams?.length == 0 || teamStore.teamsMeta.teamsError"
    >
      <img src="../../assets/login-illustration.png" alt="Login illustration" width="300" />

      <span
        class="font-bold text-sm text-gray-500 my-4"
        v-if="teamStore.teamsMeta.teams?.length == 0"
        data-test="empty-state"
      >
        You are currently not a part of any team, <strong>{{ userDataStore.name }}</strong> . Create
        a new team now!
      </span>

      <div
        class="alert alert-warning"
        v-if="teamStore.teamsMeta.teamsError"
        data-test="error-state"
      >
        We are unable to retrieve your teams. Please try again in some time.
      </div>
    </div>

    <!-- Teams List -->

    <div
      class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-20"
      data-test="team-list"
      v-if="teamStore.teamsMeta.teams?.length != 0"
    >
      <TeamCard
        v-for="team in teamStore.teamsMeta.teams"
        :key="team.id"
        :team="team"
        :data-test="`team-card-${team.id}`"
        class="cursor-pointer transition duration-300 hover:scale-105"
        @click="navigateToTeam(team.id)"
      />
    </div>

    <!-- Add Team Button -->
    <div
      class="flex justify-center"
      data-test="add-team-button"
      v-if="!teamStore.teamsMeta.teamsError && !teamStore.teamsMeta.teamsAreFetching"
    >
      <AddTeamCard
        data-test="add-team-card"
        @openAddTeamModal="appStore.setShowAddTeamModal(true)"
        class="w-72 h-16 text-sm transform transition duration-300 hover:scale-105 animate-fade-in"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter, useRoute } from 'vue-router'
import { useTeamStore, useUserDataStore } from '@/stores'
import { useAppStore } from '@/stores/appStore'
import AddTeamCard from '@/components/sections/TeamView/AddTeamCard.vue'
import TeamCard from '@/components/sections/TeamView/TeamCard.vue'
const teamStore = useTeamStore()

const route = useRoute()
const userDataStore = useUserDataStore()
const appStore = useAppStore()

const router = useRouter()

const navigateToTeam = (id: number | string) => {
  router.push(`/teams/${id}`)
}
</script>
