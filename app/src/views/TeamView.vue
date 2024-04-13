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

import axios from 'axios'
const router = useRouter()
import type { Team } from '@/types/team'
interface Member {
  id: string
  name: string
  walletAddress: string
  teamId: number
}
const teams = ref<Team[]>([])

// TODO Move this to API service
onMounted(async () => {
  try {
    const response = await axios.get('http://localhost:3000/teams', {
      data: { address: 'user_address_321' }
    })
    teams.value = response.data
    console.log(teams.value)
  } catch (error) {
    console.error('Error fetching data:', error)
  }
})
function navigateToTeam(id: string) {
  console.log(id)
  router.push('/teams/' + id)
}
</script>

<style scoped>
</style>
