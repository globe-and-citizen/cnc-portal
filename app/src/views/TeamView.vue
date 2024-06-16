<template>
  <div class="min-h-screen flex justify-center">
    <span v-if="teamsAreFetching" class="loading loading-spinner loading-lg"></span>

    <div class="pt-10" v-else>
      <h2 class="pl-5">Team</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-20">
        <TeamCard
          v-for="team in teams?.teams"
          :key="team.id"
          :team="team"
          class="cursor-pointer"
          @click="navigateToTeam(team.id)"
        />

        <AddTeamCard
          :isLoading="createTeamFetching"
          @addTeam="executeCreateTeam"
          @searchUsers="(input) => searchUsers(input)"
          :users="foundUsers"
          v-model:showAddTeamModal="showAddTeamModal"
          v-model:team="team"
          @updateAddTeamModal="handleupdateAddTeamModal"
          @addInput="addInput"
          @removeInput="removeInput"
          @toggleAddTeamModal="showAddTeamModal = !showAddTeamModal"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { isAddress } from 'ethers' // ethers v6

import AddTeamCard from '@/components/AddTeamCard.vue'
import TeamCard from '@/components/TeamCard.vue'
import { type TeamInput, type User } from '@/types'
import { useToastStore } from '@/stores/useToastStore'
import { useErrorHandler } from '@/composables/errorHandler'

import { useCustomFetch } from '@/composables/useCustomFetch'
import { logout } from '@/utils/navBarUtil'
import type { TeamsResponse } from '@/types'
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

const handleupdateAddTeamModal = (teamInput: TeamInput) => {
  team.value = teamInput
  let members = team.value.members
  members.map((member) => {
    if (isAddress(member.address)) {
      member.isValid = true
    } else {
      member.isValid = false
    }
  })
}
const teamPayload = ref(JSON.stringify(team.value))

const {
  isFetching: createTeamFetching,
  error: createTeamError,
  execute: executeCreateTeam,
  response: createTeamResponse
} = useCustomFetch('teams', {
  immediate: false,
  beforeFetch: async ({ options, url, cancel }) => {
    teamPayload.value = JSON.stringify({
      name: team.value.name,
      description: team.value.description,
      members: team.value.members.map((member) => {
        return {
          name: member.name,
          address: member.address
        }
      })
    })
    options.body = teamPayload.value
    return { options, url, cancel }
  }
})
  .post()
  .json()

watch(createTeamError, () => {
  if (createTeamError.value) {
    return useErrorHandler().handleError(new Error(createTeamError.value))
  }
})
watch(createTeamResponse, () => {
  if (createTeamResponse.value?.ok) {
    addSuccessToast('Team created successfully')
    showAddTeamModal.value = false
    executeFetchTeams()
  }
})

const addInput = () => {
  team.value.members.push({ name: '', address: '', isValid: false })
}
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
const removeInput = () => {
  if (team.value.members.length > 1) {
    team.value.members.pop()
  }
}
function navigateToTeam(id: string) {
  router.push('/teams/' + id)
}
</script>

<style scoped></style>
@/composables/apis/team
