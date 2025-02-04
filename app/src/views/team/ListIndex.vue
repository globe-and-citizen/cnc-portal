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
    <div class="flex flex-col items-center animate-fade-in" v-if="teams?.length == 0 || teamsError">
      <img src="../../assets/login-illustration.png" alt="Login illustration" width="300" />

      <span
        class="font-bold text-sm text-gray-500 my-4"
        v-if="teams?.length == 0"
        data-test="empty-state"
      >
        You are currently not a part of any team, <strong>{{ userDataStore.name }}</strong> . Create
        a new team now!
      </span>

      <div class="alert alert-warning" v-if="teamsError" data-test="error-state">
        We are unable to retrieve your teams. Please try again in some time.
      </div>
    </div>

    <!-- Add Team Button -->
    <div class="flex justify-center" data-test="testing" v-if="!teamsError && !teamsAreFetching">
      <AddTeamCard
        data-test="add-team-card"
        @openAddTeamModal="showAddTeamModal = !showAddTeamModal"
        class="w-72 h-16 text-sm transform transition duration-300 hover:scale-105 animate-fade-in"
      />
    </div>

    <!-- Add Team Modal -->
    <ModalComponent v-model="showAddTeamModal">
      <!-- May be return an event that will trigger team reload -->
      <AddTeamForm v-model="showAddTeamModal" />
    </ModalComponent>
  </div>
</template>

<script setup lang="ts">
import type { Team } from '@/types'
import { useRoute } from 'vue-router'
import { useCustomFetch } from '@/composables/useCustomFetch'
import { useUserDataStore } from '@/stores/user'
import AddTeamCard from '@/components/sections/TeamView/AddTeamCard.vue'
import AddTeamForm from '@/components/sections/TeamView/forms/AddTeamForm.vue'
import ModalComponent from '@/components/ModalComponent.vue'
import { ref } from 'vue'

const route = useRoute()
const userDataStore = useUserDataStore()

const showAddTeamModal = ref(false)

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
