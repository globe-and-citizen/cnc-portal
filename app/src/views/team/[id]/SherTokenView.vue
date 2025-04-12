<template>
  <InvestorsSection :team="team!" />
</template>

<script setup lang="ts">
import InvestorsSection from '@/components/sections/SherTokenView/InvestorsSection.vue'
import { useTeamStore } from '@/stores/teamStore'
import { ref, onMounted } from 'vue'

const teamStore = useTeamStore()
const team = ref(teamStore.currentTeam)

onMounted(() => {
  team.value = teamStore.currentTeam
})
</script>
