<template>
  <div class="flex flex-col gap-6">
    <div class="flex flex-col gap-3 md:flex-row md:items-center">
      <h2 v-if="hasVisibleTeams">{{ route.meta.name }}</h2>
      <div
        class="flex items-center gap-3 md:ml-auto"
        v-if="!teamsError && !teamsAreFetching"
        data-test="team-visibility-toggles"
      >
        <span class="text-muted text-sm">Show also</span>
        <div
          class="border-default bg-default/70 inline-flex items-center rounded-full border px-2 py-1 shadow-xs"
        >
          <div class="flex items-center gap-2 px-2">
            <USwitch
              v-model="showHidden"
              size="sm"
              :ui="{ base: showHidden ? 'data-[state=checked]:bg-success  ' : '' }"
              data-test="toggle-show-hidden"
            />
            <UIcon
              name="i-tabler-eye-off"
              class="size-4 transition-colors"
              :class="showHidden ? 'text-success' : 'text-muted'"
            />
            <span
              class="text-sm font-medium transition-colors"
              :class="showHidden ? 'text-success' : 'text-muted'"
              >Hidden</span
            >
          </div>
          <div class="bg-default/70 mx-1 h-6 w-px" />
          <div class="flex items-center gap-2 px-2">
            <USwitch
              v-model="showArchived"
              size="sm"
              :ui="{ base: showArchived ? 'data-[state=checked]:bg-warning' : '' }"
              data-test="toggle-show-archived"
            />
            <UIcon
              name="i-tabler-archive"
              class="size-4 transition-colors"
              :class="showArchived ? 'text-warning' : 'text-muted'"
            />
            <span
              class="text-sm font-medium transition-colors"
              :class="showArchived ? 'text-warning' : 'text-muted'"
              >Archived</span
            >
          </div>
        </div>
      </div>
    </div>
    <!-- Loader -->
    <div class="flex gap-3" data-test="loader" v-if="teamsAreFetching">
      <div class="flex w-1/4 flex-col gap-4" v-for="i in 4" :key="i">
        <USkeleton class="h-32 w-full" />
        <USkeleton class="h-4 w-28" />
        <USkeleton class="h-4 w-full" />
        <USkeleton class="h-4 w-full" />
      </div>
    </div>

    <!-- Empty team or Error -->
    <div
      class="animate-fade-in flex flex-col items-center"
      v-if="teamsError || (!teamsAreFetching && Array.isArray(teams) && teams.length === 0)"
    >
      <img src="../../assets/login-illustration.png" alt="Login illustration" width="300" />

      <span
        class="my-4 text-sm font-bold text-gray-500"
        v-if="
          !teamsError && Array.isArray(teams) && teams.length === 0 && !showHidden && !showArchived
        "
        data-test="empty-state"
      >
        You are currently not a part of any team, <strong>{{ userDataStore.name }}</strong> . Create
        a new team now!
      </span>

      <UAlert
        v-if="teamsError"
        color="warning"
        variant="soft"
        description="We are unable to retrieve your teams. Please try again in some time."
        data-test="error-state"
      />
    </div>

    <!-- Teams List — the create tile is the last cell, so it stays reachable
         even before the first team exists -->
    <div
      class="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] items-stretch gap-6"
      data-test="team-list"
      v-if="!teamsError && !teamsAreFetching"
    >
      <TeamCard
        v-for="team in teams"
        :key="team.id"
        :team="team"
        :data-test="`team-card-${team.id}`"
        class="cursor-pointer transition duration-300 hover:-translate-y-0.5 hover:shadow-md"
        @click="navigateToTeam(team.id)"
      />

      <div class="flex" data-test="add-team-button">
        <UModal
          v-model:open="openModal"
          title="Create Company"
          description="Create Your Company Step By Step"
          :ui="{ content: 'w-full' }"
        >
          <AddTeamCard
            data-test="add-team-card"
            @click="openModal = true"
            class="animate-fade-in w-full cursor-pointer transition duration-300 hover:-translate-y-0.5"
          />

          <template #body>
            <AddTeamForm @done="() => (openModal = false)" />
          </template>
        </UModal>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter, useRoute } from 'vue-router'
import { useUserDataStore } from '@/stores'
import AddTeamCard from '@/components/sections/TeamView/AddTeamCard.vue'
import TeamCard from '@/components/sections/TeamView/TeamCard.vue'
import { useGetTeamsQuery } from '@/queries/team.queries'
import { computed, ref, watch } from 'vue'

const openModal = ref(false)
const showHidden = ref(false)
const showArchived = ref(false)

const route = useRoute()
const userDataStore = useUserDataStore()

const {
  data: teams,
  isPending: teamsAreFetching,
  error: teamsError
} = useGetTeamsQuery({
  queryParams: {
    userAddress: userDataStore.address,
    showHidden,
    showArchived
  }
})

const hasVisibleTeams = computed(
  () =>
    !teamsAreFetching.value &&
    !teamsError.value &&
    Array.isArray(teams.value) &&
    teams.value.length > 0
)

const router = useRouter()

// Opened from the navbar team picker's "Create company" action (/teams?create=1):
// auto-open the create modal, then strip the query so a refresh won't re-open it.
watch(
  () => route.query?.create,
  (create) => {
    if (create) {
      openModal.value = true
      router.replace({ query: {} })
    }
  },
  { immediate: true }
)

const navigateToTeam = (id: number | string) => {
  router.push(`/teams/${id}`)
}
</script>
