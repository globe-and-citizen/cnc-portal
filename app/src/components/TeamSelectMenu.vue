<template>
  <USelectMenu
    v-model="selectedTeam"
    :items="teamItems"
    :loading="teamsLoading"
    placeholder="Select Company"
    by="id"
    class="w-50"
    :avatar="selectedTeam?.avatar"
    :search-input="{ placeholder: 'Search company...' }"
  />
</template>

<script setup lang="ts">
import { useUserDataStore, useTeamStore } from '@/stores'
import { useGetTeamsQuery } from '@/queries/team.queries'
import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()
const userStore = useUserDataStore()
const teamStore = useTeamStore()
const { currentTeamId } = storeToRefs(teamStore)

const { data: teams, isPending: teamsLoading } = useGetTeamsQuery({
  queryParams: { userAddress: computed(() => userStore.address) }
})

/**
 * Build short, readable initials for a team avatar:
 * first letters of the first two words ("Globe & Citizen" → "GC"),
 * or the first two characters for a single-word name ("Acme" → "AC").
 */
const getTeamInitials = (name: string) => {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return '?'
  if (words.length === 1) return words[0]!.slice(0, 2).toUpperCase()
  return (words[0]![0]! + words[1]![0]!).toUpperCase()
}

const teamItems = computed(() =>
  (teams.value ?? []).map((t) => ({
    label: t.name,
    id: t.id,
    avatar: { text: getTeamInitials(t.name) }
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
</script>
