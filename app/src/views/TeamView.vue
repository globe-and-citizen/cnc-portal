<template>
  <div class="min-h-screen flex flex-col items-center">
    <div>
      <h2 class="pt-10">Teams</h2>
    </div>
    <div v-if="teamsAreFetching" class="loading loading-spinner loading-lg"></div>

    <div class="pt-10" v-if="!teamsAreFetching && teams">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-20" v-if="teams.length != 0">
        <TeamCard
          data-test="teamcard"
          v-for="team in teams"
          :key="team.id"
          :team="team"
          class="cursor-pointer"
          @click="navigateToTeam(team.id)"
        />
        <div class="flex justify-center">
          <AddTeamCard
            @openAddTeamModal="showAddTeamModal = !showAddTeamModal"
            class="w-80 text-xl"
          />
        </div>
      </div>
      <div class="flex flex-col items-center" v-if="teams.length == 0">
        <img src="../assets/login-illustration.png" alt="Login illustration" width="300" />

        <span class="font-bold text-sm text-gray-500 my-4"
          >You are currently not a part of any team, {{ useUserDataStore().name }}. Create a new
          team now!</span
        >

        <div class="flex justify-center">
          <AddTeamCard
            @openAddTeamModal="showAddTeamModal = !showAddTeamModal"
            class="w-72 h-16 text-sm"
          />
        </div>
      </div>
    </div>
    <div class="flex flex-col items-center pt-10" v-if="teamError">
      <img src="../assets/login-illustration.png" alt="Login illustration" width="300" />

      <div class="alert alert-warning">
        We are unable to retrieve your teams. Please try again in some time.
      </div>
    </div>
    <ModalComponent v-model="showAddTeamModal">
      <AddTeamForm
        :isLoading="createTeamFetching"
        v-model="team"
        :users="foundUsers"
        @searchUsers="(input) => searchUsers(input)"
        @addTeam="executeCreateTeam"
      />
    </ModalComponent>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import AddTeamCard from '@/components/sections/TeamView/AddTeamCard.vue'
import TeamCard from '@/components/sections/TeamView/TeamCard.vue'
import { type TeamInput, type User } from '@/types'
import { useToastStore } from '@/stores/useToastStore'

import { useCustomFetch } from '@/composables/useCustomFetch'
import type { TeamsResponse } from '@/types'
import AddTeamForm from '@/components/sections/TeamView/forms/AddTeamForm.vue'
import ModalComponent from '@/components/ModalComponent.vue'
import { useUserDataStore } from '@/stores/user'
const router = useRouter()

const { addSuccessToast, addErrorToast } = useToastStore()

/**
 * @returns {isFetching: Ref<boolean>, error: Ref<Error>, data: Ref<Team[]>, execute: () => Promise<void>}
 * isFetching - Can be used to show loading spinner
 * execute - Can be used to fetch data again later: ex: when a new team is added
 */

const {
  isFetching: teamsAreFetching,
  error: teamError,
  data: teams,
  execute: executeFetchTeams
} = useCustomFetch<TeamsResponse>('teams').json()

watch(teamError, () => {
  if (teamError.value) {
    // TODO refactor this to use toast or someting better
    addErrorToast(teamError.value)
  }
})

const foundUsers = ref<User[]>([])
const showAddTeamModal = ref(false)
const team = ref<TeamInput>({
  name: '',
  description: '',
  members: [
    {
      name: '',
      address: ''
    }
  ]
})

const {
  isFetching: createTeamFetching,
  error: createTeamError,
  execute: executeCreateTeam,
  response: createTeamResponse
} = useCustomFetch('teams', {
  immediate: false
})
  .post(team)
  .json()

watch(createTeamError, () => {
  if (createTeamError.value) {
    addErrorToast(createTeamError.value)
  }
})
watch(
  [() => createTeamFetching.value, () => createTeamError.value, () => createTeamResponse.value],
  () => {
    if (!createTeamFetching.value && !createTeamError.value && createTeamResponse.value?.ok) {
      addSuccessToast('Team created successfully')
      team.value = {
        name: '',
        description: '',
        members: []
      }
      showAddTeamModal.value = false
      executeFetchTeams()
    }
  }
)

const searchUserName = ref('')
const searchUserAddress = ref('')
const {
  execute: executeSearchUser,
  response: searchUserResponse,
  data: users
} = useCustomFetch('user/search', {
  immediate: false,
  beforeFetch: async ({ options, url, cancel }) => {
    const params = new URLSearchParams()
    if (!searchUserName.value && !searchUserAddress.value) return
    if (searchUserName.value) params.append('name', searchUserName.value)
    if (searchUserAddress.value) params.append('address', searchUserAddress.value)
    url += '?' + params.toString()
    return { options, url, cancel }
  }
})
  .get()
  .json()

watch(searchUserResponse, () => {
  if (searchUserResponse.value?.ok && users.value?.users) {
    foundUsers.value = users.value.users
  }
})
const searchUsers = async (input: { name: string; address: string }) => {
  searchUserName.value = input.name
  searchUserAddress.value = input.address
  if (searchUserName.value || searchUserAddress.value) {
    await executeSearchUser()
  }
}

function navigateToTeam(id: string) {
  router.push('/teams/' + id)
}
</script>

<style scoped></style>
