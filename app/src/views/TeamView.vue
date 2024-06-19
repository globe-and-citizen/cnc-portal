<template>
  <div class="min-h-screen flex justify-center">
    <span v-if="teamsAreFetching" class="loading loading-spinner loading-lg"></span>

    <div class="pt-10" v-if="!teamsAreFetching && teams">
      <h2 class="pl-5">Team</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-20">
        <TeamCard
          v-for="team in teams"
          :key="team.id"
          :team="team"
          class="cursor-pointer"
          @click="navigateToTeam(team.id)"
        />

        <AddTeamCard @openAddTeamModal="showAddTeamModal = !showAddTeamModal" />
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
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import AddTeamCard from '@/components/AddTeamCard.vue'
import TeamCard from '@/components/TeamCard.vue'
import { type TeamInput, type User } from '@/types'
import { useToastStore } from '@/stores/useToastStore'
import { useErrorHandler } from '@/composables/errorHandler'

import { useCustomFetch } from '@/composables/useCustomFetch'
import { logout } from '@/utils/navBarUtil'
import type { TeamsResponse } from '@/types'
import AddTeamForm from '@/components/forms/AddTeamForm.vue'
import ModalComponent from '@/components/ModalComponent.vue'
const router = useRouter()

const { addSuccessToast } = useToastStore()

// const teams = ref<Team[]>([])
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
    if (teamError.value === 'Unauthorized') {
      logout()
    }
    return useErrorHandler().handleError(new Error(teamError.value))
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
      address: '',
      isValid: false
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
    return useErrorHandler().handleError(new Error(createTeamError.value))
  }
})
watch(
  [() => createTeamFetching.value, () => createTeamError.value, () => createTeamResponse.value],
  () => {
    if (!createTeamFetching.value && !createTeamError.value && createTeamResponse.value?.ok) {
      addSuccessToast('Team created successfully')
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
@/composables/apis/team
