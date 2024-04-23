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
  <NotificationToast v-if="showToast" :type="toastType" :message="toastMessage" />
</template>

<script setup lang="ts">
import AddTeamCard from '@/components/AddTeamCard.vue'
import TeamCard from '../components/TeamCard.vue'
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { FetchTeamAPI } from '@/apis/teamApi'
const router = useRouter()
import type { Team } from '@/types/types'
import { useToastStore } from '@/stores/toast'
import { storeToRefs } from 'pinia'
import NotificationToast from '@/components/NotificationToast.vue'

const teamApi = new FetchTeamAPI()
const teams = ref<Team[]>([])
const toastStore = useToastStore()
const { showToast, type: toastType, message: toastMessage } = storeToRefs(toastStore)

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
