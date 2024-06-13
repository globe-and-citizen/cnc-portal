<template>
  <div class="pt-10">
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
        @addTeam="handleAddTeam"
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
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { isAddress } from 'ethers' // ethers v6

import AddTeamCard from '@/components/AddTeamCard.vue'
import TeamCard from '@/components/TeamCard.vue'
import { ToastType, type TeamInput, type User } from '@/types'
import { useToastStore } from '@/stores/useToastStore'
import { FetchUserAPI } from '@/apis/userApi'
import { FetchTeamAPI } from '@/apis/teamApi'
import { useErrorHandler } from '@/composables/errorHandler'
import { useCustomFetch } from '@/composables/useCustomFetch'
import type { TeamsResponse } from '@/types/index'
const router = useRouter()

const userApi = new FetchUserAPI()

const { addToast } = useToastStore()

const teamApi = new FetchTeamAPI()

// const teams = ref<Team[]>([])
/**
 * @returns {isFetching: Ref<boolean>, error: Ref<Error>, data: Ref<Team[]>, execute: () => Promise<void>}
 * isFetching - Can be used to show loading spinner
 * execute - Can be used to fetch data again later: ex: when a new team is added
 */

const {
  isFetching: teamIsFetching,
  error: teamError,
  data: teams,
  execute: executeFetchTeams
} = useCustomFetch<TeamsResponse>('teams').json()
watch(teamError, () => {
  if (teamError.value) {
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
const handleAddTeam = async () => {
  const members = team.value.members.map((member) => {
    return {
      name: member.name,
      address: member.address
    }
  })
  try {
    const createdTeam = await teamApi.createTeam(team.value.name, team.value.description, members)
    if (createdTeam && Object.keys(createdTeam).length !== 0) {
      addToast({ type: ToastType.Success, message: 'Team created successfully', timeout: 5000 })
      showAddTeamModal.value = !showAddTeamModal.value
      executeFetchTeams()
    }
  } catch (error) {
    return useErrorHandler().handleError(error)
  }
}
const addInput = () => {
  team.value.members.push({ name: '', address: '', isValid: false })
}
const searchUsers = async (input: { name: string; address: string }) => {
  try {
    const users = await userApi.searchUser(input.name, input.address)
    foundUsers.value = users
    console.log(users)
  } catch (error) {
    foundUsers.value = []
    return useErrorHandler().handleError(error)
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
