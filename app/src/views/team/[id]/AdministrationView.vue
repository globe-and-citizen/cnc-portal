<template>
  <TabNavigation v-if="team" v-model="activeTab" :tabs="tabs" class="w-full">
    <template #tab-0>
      <BoardOfDirectorsSection v-if="activeTab == 0" :team="team" />
    </template>
  </TabNavigation>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import TabNavigation from '@/components/TabNavigation.vue'
import { SingleTeamTabs } from '@/types'
import BoardOfDirectorsSection from '@/components/sections/AdministrationView/BoardOfDirectorsSection.vue'
import { useTeamStore } from '@/stores'

const teamStore = useTeamStore()
const team = computed(() => teamStore.currentTeam)

const activeTab = ref(0)
const tabs = ref<Array<SingleTeamTabs>>([SingleTeamTabs.Proposals, SingleTeamTabs.BoardOfDirectors])
</script>
