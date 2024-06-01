<template>
  <div class="pt-10">
    <h2 class="pl-5">Team</h2>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-20">
      <TeamCard
        v-for="team in teams"
        :key="team.id"
        :team="team"
        class="cursor-pointer"
        @click="navigateToTeam(team.id)"
      />

      <AddTeamCard
        @addTeam="handleAddTeam"
        @searchUsers="(input) => searchUsers(input)"
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
import AddTeamCard from '@/components/AddTeamCard.vue'
import TeamCard from '../components/TeamCard.vue'
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { FetchTeamAPI } from '@/apis/teamApi'
const router = useRouter()
import { ToastType, type Team, type TeamInput } from '@/types'
import { isAddress } from 'ethers' // ethers v6
import { useToastStore } from '@/stores/toast'
import { useErrorHandler } from '@/composables/errorHandler'
import { FetchUserAPI } from '@/apis/userApi'

const userApi = new FetchUserAPI()

const { show } = useToastStore()
const teamApi = new FetchTeamAPI()
const teams = ref<Team[]>([])

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
      show(ToastType.Success, 'Team created successfully')
      showAddTeamModal.value = !showAddTeamModal.value
      teams.value.push(createdTeam)
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
    console.log(users)
  } catch (error) {
    return useErrorHandler().handleError(error)
  }
}
const removeInput = () => {
  if (team.value.members.length > 1) {
    team.value.members.pop()
  }
}
onMounted(async () => {
  try {
    const teamsList = await teamApi.getAllTeams()
    teams.value = teamsList
  } catch (error) {
    return useErrorHandler().handleError(error)
  }
})
function navigateToTeam(id: string) {
  router.push('/teams/' + id)
}
</script>

<style scoped></style>
