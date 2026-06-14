<template>
  <div class="flex flex-col gap-6">
    <!-- Toolbar -->
    <div class="flex flex-col gap-3 lg:flex-row lg:items-center" data-test="companies-toolbar">
      <div class="flex items-center gap-3">
        <h2>{{ route.meta.name }}</h2>
        <!-- Role segmented control -->
        <div
          class="border-default bg-default inline-flex items-center gap-0.5 rounded-lg border p-0.5"
          data-test="role-filter"
        >
          <UButton
            :color="role === 'all' ? 'primary' : 'neutral'"
            :variant="role === 'all' ? 'soft' : 'ghost'"
            size="xs"
            data-test="role-option-all"
            @click="role = 'all'"
          >
            All · {{ counts.all }}
          </UButton>
          <UButton
            :color="role === 'owner' ? 'primary' : 'neutral'"
            :variant="role === 'owner' ? 'soft' : 'ghost'"
            size="xs"
            data-test="role-option-owner"
            @click="role = 'owner'"
          >
            Owner · {{ counts.owner }}
          </UButton>
          <UButton
            :color="role === 'employee' ? 'primary' : 'neutral'"
            :variant="role === 'employee' ? 'soft' : 'ghost'"
            size="xs"
            data-test="role-option-employee"
            @click="role = 'employee'"
          >
            Employee · {{ counts.employee }}
          </UButton>
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-2 lg:ml-auto">
        <!-- Search -->
        <UInput
          v-model="query"
          icon="i-heroicons-magnifying-glass"
          placeholder="Search companies"
          data-test="search-companies"
        />

        <!-- Filters popover -->
        <UPopover data-test="filters-popover">
          <UButton
            color="neutral"
            variant="soft"
            icon="i-heroicons-adjustments-horizontal"
            trailing-icon="i-heroicons-chevron-down"
            data-test="filters-button"
          >
            Filters
            <UBadge
              v-if="activeVisibilityCount > 0"
              color="primary"
              size="sm"
              data-test="filters-count-badge"
            >
              {{ activeVisibilityCount }}
            </UBadge>
          </UButton>

          <template #content>
            <div class="flex w-64 flex-col gap-1 p-3" data-test="filters-panel">
              <p class="text-muted text-xs font-semibold tracking-wide uppercase">Visibility</p>
              <div class="flex items-center justify-between gap-3 py-2">
                <div class="flex min-w-0 flex-col">
                  <span class="text-default text-sm font-medium">Hidden companies</span>
                  <span class="text-muted text-xs">Teams you set aside</span>
                </div>
                <USwitch
                  v-model="showHidden"
                  size="sm"
                  :ui="{ base: showHidden ? 'data-[state=checked]:bg-success' : '' }"
                  data-test="toggle-show-hidden"
                />
              </div>
              <div class="border-muted flex items-center justify-between gap-3 border-t py-2">
                <div class="flex min-w-0 flex-col">
                  <span class="text-default text-sm font-medium">Archived companies</span>
                  <span class="text-muted text-xs">Closed or dormant teams</span>
                </div>
                <USwitch
                  v-model="showArchived"
                  size="sm"
                  :ui="{ base: showArchived ? 'data-[state=checked]:bg-warning' : '' }"
                  data-test="toggle-show-archived"
                />
              </div>
              <UButton
                color="neutral"
                variant="soft"
                size="sm"
                block
                :disabled="activeVisibilityCount === 0"
                data-test="reset-visibility"
                @click="resetVisibility"
              >
                Reset visibility
              </UButton>
            </div>
          </template>
        </UPopover>

        <!-- View toggle -->
        <div
          class="border-default bg-default inline-flex items-center gap-0.5 rounded-lg border p-0.5"
          data-test="view-toggle"
        >
          <UButton
            :color="view === 'cards' ? 'primary' : 'neutral'"
            :variant="view === 'cards' ? 'soft' : 'ghost'"
            size="sm"
            icon="i-heroicons-squares-2x2"
            aria-label="Cards view"
            data-test="view-toggle-cards"
            @click="view = 'cards'"
          />
          <UButton
            :color="view === 'table' ? 'primary' : 'neutral'"
            :variant="view === 'table' ? 'soft' : 'ghost'"
            size="sm"
            icon="i-heroicons-table-cells"
            aria-label="Table view"
            data-test="view-toggle-table"
            @click="view = 'table'"
          />
        </div>

        <!-- Create Company -->
        <UModal
          v-model:open="openModal"
          title="Create Company"
          description="Create Your Company Step By Step"
        >
          <UButton
            color="primary"
            icon="i-heroicons-plus"
            label="Create Company"
            data-test="create-company-button"
            @click="openModal = true"
          />

          <template #body>
            <AddTeamForm
              @done="
                () => {
                  openModal = false
                }
              "
            />
          </template>
        </UModal>
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

    <!-- Teams List -->
    <template v-if="!teamsError && !teamsAreFetching && Array.isArray(teams) && teams.length > 0">
      <!-- Table view placeholder (real table comes in a later ticket) -->
      <div
        v-if="view === 'table'"
        class="text-muted border-default rounded-lg border border-dashed p-8 text-center text-sm"
        data-test="table-placeholder"
      >
        Table view — coming soon
      </div>

      <!-- Cards grid -->
      <div
        v-else
        class="grid grid-cols-1 gap-20 md:grid-cols-2 lg:grid-cols-3"
        data-test="team-list"
      >
        <TeamCard
          v-for="team in filtered"
          :key="team.id"
          :team="team"
          :data-test="`team-card-${team.id}`"
          class="cursor-pointer transition duration-300 hover:scale-105"
          @click="navigateToTeam(team.id)"
        />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { useRouter, useRoute } from 'vue-router'
import { useUserDataStore } from '@/stores'
import TeamCard from '@/components/sections/TeamView/TeamCard.vue'
import { useGetTeamsQuery } from '@/queries/team.queries'
import { useCompaniesFilter, type CompanyRoleFilter } from '@/composables/useCompaniesFilter'
import { computed, ref } from 'vue'

const openModal = ref(false)
const showHidden = ref(false)
const showArchived = ref(false)
const role = ref<CompanyRoleFilter>('all')
const query = ref('')
const view = ref<'cards' | 'table'>('cards')

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

const { filtered, counts } = useCompaniesFilter(teams, {
  userAddress: () => userDataStore.address,
  role,
  query,
  showHidden,
  showArchived
})

/** How many visibility filters are currently active (drives the badge). */
const activeVisibilityCount = computed(
  () => (showHidden.value ? 1 : 0) + (showArchived.value ? 1 : 0)
)

function resetVisibility() {
  showHidden.value = false
  showArchived.value = false
}

const router = useRouter()

const navigateToTeam = (id: number | string) => {
  router.push(`/teams/${id}`)
}
</script>
