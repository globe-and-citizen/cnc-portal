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

      <AddTeamCard />
    </div>
  </div>
</template>

<script setup lang="ts">
import AddTeamCard from '@/components/AddTeamCard.vue'
import TeamCard from '../components/TeamCard.vue'
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
import type { Team } from '@/types/types'
interface Member {
  id: string
  name: string
  walletAddress: string
  teamId: number
}
const teams = ref<Team[]>([])

// TODO Move this to API service
onMounted(async () => {
  const requestOptions = {
    method: 'GET'
  }

  try {
    const response = await fetch('http://localhost:3000/api/teams', requestOptions)
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`)
    }
    teams.value = await response.json()
    console.log(teams.value)
  } catch (error) {
    console.error('Error:', error)
  }
})
function navigateToTeam(id: string) {
  console.log(id)
  router.push('/teams/' + id)
}
</script>

<style scoped></style>
