<template>
  <div class="flex flex-col gap-6">
    <div>
      <h2>{{ route.meta.name }}</h2>
    </div>
    <div class="flex gap-3" v-if="teamsAreFetching">
      <div class="flex w-1/4 flex-col gap-4" v-for="i in 4" :key="i">
        <div class="skeleton h-32 w-full"></div>
        <div class="skeleton h-4 w-28"></div>
        <div class="skeleton h-4 w-full"></div>
        <div class="skeleton h-4 w-full"></div>
      </div>
    </div>
    <div
      class="flex flex-col items-center animate-fade-in"
      data-test="empty-state"
      v-if="teams?.length == 0"
    >
      <img src="../../assets/login-illustration.png" alt="Login illustration" width="300" />

      <span class="font-bold text-sm text-gray-500 my-4"
        >You are currently not a part of any team, <strong>{{ userDataStore.name }}</strong
        >. Create a new team now!</span
      >

      <div class="flex justify-center" data-test="testing">
        <AddTeamCard
          data-test="add-team-card"
          class="w-72 h-16 text-sm transform transition duration-300 hover:scale-105 animate-fade-in"
        />
      </div>
    </div>
    <div class="flex flex-col items-center pt-10" data-test="error-state" v-if="teamsError">
      <img src="../../assets/login-illustration.png" alt="Login illustration" width="300" />

      <div class="alert alert-warning">
        We are unable to retrieve your teams. Please try again in some time.
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Team } from '@/types'
import { useRoute } from 'vue-router'
import { useCustomFetch } from '@/composables/useCustomFetch'
import { useUserDataStore } from '@/stores/user'
import AddTeamCard from '@/components/sections/TeamView/AddTeamCard.vue'

const route = useRoute()
const userDataStore = useUserDataStore()

/**
 * @description Fetch User Team
 * @returns teams, teamsAreFetching, teamsError
 */

const {
  isFetching: teamsAreFetching,
  error: teamsError,
  data: teams
} = useCustomFetch('teams').json<Array<Team>>()
</script>
