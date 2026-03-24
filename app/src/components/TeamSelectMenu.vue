<template>
  <USelectMenu
    v-model="selectedTeam"
    :items="teamItems"
    :loading="teamsLoading"
    placeholder="Select team"
    by="id"
    class="w-50"
    size="xl"
    :avatar="selectedTeam?.avatar"
    :search-input="{ placeholder: 'Search team...' }"
  />
</template>

<script setup lang="ts">
import { useUserDataStore, useTeamStore } from '@/stores'
import { useGetTeamsQuery } from '@/queries/team.queries'
import { storeToRefs } from 'pinia'
import { computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()
const userStore = useUserDataStore()
const teamStore = useTeamStore()
const { currentTeamId } = storeToRefs(teamStore)

const { data: teams, isPending: teamsLoading } = useGetTeamsQuery({
  queryParams: { userAddress: computed(() => userStore.address) }
})

const teamItems = computed(() =>
  (teams.value ?? []).map((t) => ({
    label: t.name,
    id: t.id,
    avatar: { text: t.name.charAt(0).toUpperCase() }
  }))
)

// The active team id: prefer the route param (most authoritative), then the store
const activeTeamId = computed(
  () => (route.params.id as string | undefined) ?? currentTeamId.value ?? null
)

const selectedTeam = computed({
  get() {
    return teamItems.value.find((t) => Number(t.id) === Number(activeTeamId.value)) ?? undefined
  },
  set(item: { label: string; id: string } | undefined) {
    if (item) {
      teamStore.setCurrentTeamId(item.id)
      router.push(`/teams/${item.id}`)
    }
  }
})

// When teams load and no team is active yet, default to the first one
watch(teamItems, (items) => {
  const first = items[0]
  if (!activeTeamId.value && first) {
    teamStore.setCurrentTeamId(first.id)
    router.push(`/teams/${first.id}`)
  }
}, { immediate: true })
</script>
