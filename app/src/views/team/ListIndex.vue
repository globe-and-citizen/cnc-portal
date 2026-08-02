<template>
  <div class="flex flex-col gap-6">
    <CompaniesListToolbar
      v-model:role="role"
      v-model:query="query"
      v-model:show-hidden="showHidden"
      v-model:show-archived="showArchived"
      v-model:view="view"
      :title="title"
      :counts="counts"
    />

    <!-- Treasury recap -->
    <CompaniesTreasuryRecap
      v-if="showRecap"
      :aggregate="aggregate"
      :owner-count="counts.owner"
      :member-count="counts.employee"
      data-test="companies-recap"
    />

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
      <!-- No results for the active filters -->
      <div
        v-if="filtered.length === 0"
        class="text-muted border-default flex flex-col items-center gap-3 rounded-lg border border-dashed p-8 text-center text-sm"
        data-test="filter-empty-state"
      >
        <p>No companies match your filters.</p>
        <UButton
          color="neutral"
          variant="soft"
          size="sm"
          data-test="clear-filters"
          @click="clearFilters"
        >
          Clear filters
        </UButton>
      </div>

      <!-- Table view -->
      <div v-else-if="view === 'table'" class="overflow-x-auto" data-test="table-view">
        <CompaniesTable :teams="filtered" @open="navigateToTeam" @action="handleAction" />
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
          @action="handleAction"
        />
      </div>
    </template>

    <!-- Shared archive / delete confirmation -->
    <CompanyActionConfirm
      v-if="confirmKind"
      :open="confirmOpen"
      :kind="confirmKind ?? 'archive'"
      :team-name="activeTeam?.name"
      :loading="confirmLoading"
      :error-message="confirmErrorMessage"
      data-test="company-action-confirm"
      @update:open="onConfirmOpenChange"
      @confirm="onConfirm"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserDataStore } from '@/stores'
import TeamCard from '@/components/sections/TeamView/TeamCard.vue'
import CompaniesListToolbar from '@/components/sections/CompaniesView/CompaniesListToolbar.vue'
import CompaniesTreasuryRecap from '@/components/sections/CompaniesView/CompaniesTreasuryRecap.vue'
import CompaniesTable from '@/components/sections/CompaniesView/CompaniesTable.vue'
import CompanyActionConfirm from '@/components/sections/CompaniesView/CompanyActionConfirm.vue'
import { useGetTeamsQuery } from '@/queries/team.queries'
import { useCompaniesFilter, type CompanyRoleFilter } from '@/composables/useCompaniesFilter'
import { useTeamsTreasury } from '@/composables/treasury/useTeamsTreasury'
import { useCompanyActions } from '@/composables/useCompanyActions'

const showHidden = ref(false)
const showArchived = ref(false)
const role = ref<CompanyRoleFilter>('all')
const query = ref('')
const view = ref<'cards' | 'table'>('cards')

const route = useRoute()
const router = useRouter()
const userDataStore = useUserDataStore()

const title = computed(() => (route.meta.name as string | undefined) ?? 'Companies')

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

const { aggregate } = useTeamsTreasury(() => teams.value ?? [])

const showRecap = computed(
  () =>
    !teamsAreFetching.value &&
    !teamsError.value &&
    Array.isArray(teams.value) &&
    teams.value.length > 0
)

function clearFilters() {
  role.value = 'all'
  query.value = ''
  showHidden.value = false
  showArchived.value = false
}

const navigateToTeam = (id: number | string) => {
  router.push(`/teams/${id}`)
}

const {
  activeTeam,
  confirmKind,
  confirmOpen,
  confirmLoading,
  confirmErrorMessage,
  handleAction,
  onConfirmOpenChange,
  onConfirm
} = useCompanyActions(teams, { onUpdate: navigateToTeam })
</script>
