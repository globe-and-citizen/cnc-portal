<template>
    <ProposalSection v-if="team" :team="team"/>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import TabNavigation from '@/components/TabNavigation.vue'
import { SingleTeamTabs } from '@/types'
import ProposalSection from '@/components/sections/AdministrationView/ProposalSection.vue'
import BoardOfDirectorsSection from '@/components/sections/AdministrationView/BoardOfDirectorsSection.vue'
import { useTeamStore } from '@/stores'

const teamStore = useTeamStore()
const team = computed(() => teamStore.currentTeam)

const activeTab = ref(0)
const tabs = ref<Array<SingleTeamTabs>>([SingleTeamTabs.Proposals, SingleTeamTabs.BoardOfDirectors])
</script>
