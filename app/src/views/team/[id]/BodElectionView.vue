<template>
  <CurrentBoDSection />
  <CurrentBoDElectionSection />
  <BoDElectionSection v-if="team" :team="team" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import BoDElectionSection from '@/components/sections/AdministrationView/BoDElectionSection.vue'
import CurrentBoDSection from '@/components/sections/AdministrationView/CurrentBoDSection.vue'
import CurrentBoDElectionSection from '@/components/sections/AdministrationView/CurrentBoDElectionSection.vue'
import { useTeamStore } from '@/stores'

const teamStore = useTeamStore()
const team = computed(() => teamStore.currentTeam)
</script>
