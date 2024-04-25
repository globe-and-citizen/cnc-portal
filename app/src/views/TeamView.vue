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

      <AddTeamCard @addTeam="handleAddTeam" v-model:showUpdateForm="showAddTeamForm" />
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
import type { Member, Team } from '@/types/types'
import { isAddress } from 'ethers' // ethers v6
import { useToastStore } from '@/stores/toast'
import { ToastType } from '@/types'

const { show } = useToastStore()
const teamApi = new FetchTeamAPI()
const teams = ref<Team[]>([])

const showAddTeamForm = ref(false)

const handleAddTeam = (teamName: string, teamDesc: string, teamMembers: Partial<Member>[]) => {
  let isValid = true
  let errorIndexes: number[] = []

  teamMembers.map((member, index) => {
    if (!isAddress(member.walletAddress)) {
      isValid = false
      errorIndexes.push(index)
    }
  })

  if (!isValid) {
    show(ToastType.Warning, 'Invalid wallet address')

    console.error('Invalid wallet address for one or more team members')
    return
  }
  teamApi
    .createTeam(teamName, teamDesc, teamMembers)
    .then((createdTeam) => {
      console.log('Created team:', createdTeam)
      window.location.reload()
    })
    .catch((error) => {
      console.error('Error creating team:', error)
    })
}
onMounted(async () => {
  teamApi
    .getAllTeams()
    .then((teamsList) => {
      console.log('Fetched teams:', teamsList)
      teams.value = teamsList
    })
    .catch((error) => {
      console.error('Error fetching teams:', error)
    })
})
function navigateToTeam(id: string) {
  console.log(id)
  router.push('/teams/' + id)
}
</script>

<style scoped></style>
