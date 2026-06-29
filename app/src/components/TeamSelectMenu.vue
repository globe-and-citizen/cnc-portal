<template>
  <UPopover
    v-model:open="open"
    :content="{ align: 'end', sideOffset: 8 }"
    :ui="{ content: 'w-[19.25rem]' }"
  >
    <!-- Trigger: soft primary pill with a gradient initials chip -->
    <UButton
      color="primary"
      variant="soft"
      class="h-9 gap-1.5 rounded-lg px-3 text-[13px] font-semibold"
      data-test="team-picker"
    >
      <span
        v-if="!teamsLoading"
        class="flex size-[18px] shrink-0 items-center justify-center rounded-[5px] text-[8px] font-bold text-white"
        :style="gradientStyle"
        >{{ teamMark }}</span
      >
      <UIcon v-else name="i-lucide-loader-circle" class="size-4 animate-spin" data-test="loader" />
      <span class="max-w-[10rem] truncate">{{ teamLabel }}</span>
      <UIcon name="i-heroicons-chevron-up-down" class="size-4 shrink-0" />
    </UButton>

    <template #content>
      <div class="flex max-h-[80vh] flex-col" data-test="team-menu">
        <!-- Header -->
        <div class="flex items-center justify-between px-3.5 pt-3 pb-2">
          <span class="text-dimmed text-[11px] font-bold tracking-wider uppercase"
            >Switch team</span
          >
          <span class="text-muted text-[11px]">{{ teamCountLabel }}</span>
        </div>

        <!-- Search -->
        <div class="px-2.5 pb-2">
          <UInput
            v-model="query"
            icon="i-heroicons-magnifying-glass"
            placeholder="Search teams"
            size="sm"
            class="w-full"
            :ui="{ root: 'w-full' }"
          >
            <template v-if="query" #trailing>
              <UButton
                color="neutral"
                variant="link"
                size="xs"
                icon="i-heroicons-x-mark"
                aria-label="Clear search"
                data-test="clear-search"
                @click="query = ''"
              />
            </template>
          </UInput>
        </div>

        <!-- All companies (hidden while searching) -->
        <template v-if="!query">
          <button
            type="button"
            :class="[menuItemClass, isAllCompaniesActive ? 'bg-primary/10' : '']"
            data-test="all-companies"
            @click="goAllCompanies"
          >
            <span
              class="bg-muted text-muted border-default flex size-[30px] shrink-0 items-center justify-center rounded-lg border"
            >
              <UIcon name="i-heroicons-squares-2x2" class="size-4" />
            </span>
            <span class="min-w-0 flex-1">
              <span class="text-highlighted block text-[13px] font-semibold">All companies</span>
              <span class="text-muted block text-[11px]"
                >Portfolio overview · {{ teamCountLabel }}</span
              >
            </span>
            <UIcon
              v-if="isAllCompaniesActive"
              name="i-heroicons-check"
              class="text-primary size-4 shrink-0"
            />
          </button>
          <div class="bg-border-muted mx-1.5 my-1 h-px" />
        </template>

        <!-- Team list -->
        <div class="overflow-y-auto px-1.5 pb-1.5">
          <button
            v-for="t in filteredTeams"
            :key="t.id"
            type="button"
            :class="[menuItemClass, isTeamActive(t) ? 'bg-primary/10' : '']"
            :data-test="`team-option-${t.id}`"
            @click="selectTeam(t)"
          >
            <span
              class="flex size-[30px] shrink-0 items-center justify-center rounded-lg text-[12px] font-bold"
              :class="isOwner(t) ? 'bg-primary/10 text-primary' : 'bg-secondary/10 text-secondary'"
              >{{ getTeamInitials(t.name) }}</span
            >
            <span class="min-w-0 flex-1">
              <span class="flex min-w-0 items-center gap-1.5">
                <span class="text-highlighted truncate text-[13px] font-semibold">{{
                  t.name
                }}</span>
                <UBadge
                  :color="isOwner(t) ? 'primary' : 'secondary'"
                  variant="solid"
                  size="sm"
                  class="shrink-0"
                  >{{ isOwner(t) ? 'Owner' : 'Employee' }}</UBadge
                >
              </span>
              <span class="text-muted block text-[11px]">{{ teamSubtitle(t) }}</span>
            </span>
            <UIcon
              v-if="isTeamActive(t)"
              name="i-heroicons-check"
              class="text-primary size-4 shrink-0"
            />
          </button>

          <p
            v-if="filteredTeams.length === 0"
            class="text-muted px-3.5 py-6 text-center text-[13px]"
            data-test="team-empty"
          >
            No teams match “{{ query }}”
          </p>
        </div>

        <!-- Footer: create company -->
        <div class="border-default border-t p-1.5">
          <button
            type="button"
            :class="[menuItemClass, 'text-primary font-semibold']"
            data-test="create-company"
            @click="createCompany"
          >
            <span
              class="bg-primary/10 text-primary flex size-[30px] shrink-0 items-center justify-center rounded-lg"
            >
              <UIcon name="i-heroicons-plus" class="size-4" />
            </span>
            Create company
          </button>
        </div>
      </div>
    </template>
  </UPopover>
</template>

<script setup lang="ts">
import { useUserDataStore, useTeamStore } from '@/stores'
import { useGetTeamsQuery } from '@/queries/team.queries'
import type { Team } from '@/types/team'
import { computed, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()
const userStore = useUserDataStore()
const teamStore = useTeamStore()

const open = ref(false)
const query = ref('')

const { data: teams, isPending: teamsLoading } = useGetTeamsQuery({
  queryParams: { userAddress: computed(() => userStore.address) }
})

/** Shared row styling for the dropdown items. */
const menuItemClass =
  'flex w-full items-center gap-2.5 rounded-[9px] px-2.5 py-2 text-left transition-colors hover:bg-muted'

const gradientStyle = {
  background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))'
}

/**
 * Short, readable initials for a team chip:
 * first letters of the first two words ("Globe & Citizen" → "GC"),
 * or the first two characters for a single-word name ("Acme" → "AC").
 */
const getTeamInitials = (name: string) => {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return '?'
  if (words.length === 1) return words[0]!.slice(0, 2).toUpperCase()
  return (words[0]![0]! + words[1]![0]!).toUpperCase()
}

const teamList = computed<Team[]>(() => teams.value ?? [])

// The route is the source of truth for which company is open.
const activeTeamId = computed(() => (route.params.id as string | undefined) ?? null)
const selectedTeam = computed(() =>
  teamList.value.find((t) => Number(t.id) === Number(activeTeamId.value))
)

const teamMark = computed(() =>
  selectedTeam.value ? getTeamInitials(selectedTeam.value.name) : '∗'
)
const teamLabel = computed(() => selectedTeam.value?.name ?? 'All companies')
const teamCountLabel = computed(() => `${teamList.value.length} companies`)
const isAllCompaniesActive = computed(() => !activeTeamId.value)

const isOwner = (team: Team) =>
  !!team.ownerAddress &&
  !!userStore.address &&
  team.ownerAddress.toLowerCase() === userStore.address.toLowerCase()

const isTeamActive = (team: Team) => Number(team.id) === Number(activeTeamId.value)

const memberCount = (team: Team) => team._count?.members ?? team.members?.length ?? 0
const teamSubtitle = (team: Team) => `${memberCount(team)} members`

const filteredTeams = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return teamList.value
  return teamList.value.filter(
    (t) => t.name.toLowerCase().includes(q) || getTeamInitials(t.name).toLowerCase().includes(q)
  )
})

const closeMenu = () => {
  open.value = false
  query.value = ''
}

const selectTeam = (team: Team) => {
  teamStore.setCurrentTeamId(team.id)
  router.push(`/teams/${team.id}`)
  closeMenu()
}

const goAllCompanies = () => {
  router.push('/teams')
  closeMenu()
}

const createCompany = () => {
  router.push({ path: '/teams', query: { create: '1' } })
  closeMenu()
}
</script>
