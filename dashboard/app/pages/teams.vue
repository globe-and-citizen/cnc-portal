<script setup lang="ts">
const { teams, isLoading, error, stats, fetchTeams } = useTeams();

// Fetch teams on mount
onMounted(async () => {
  await fetchTeams();
});

// Refresh handler
const handleRefresh = async () => {
  await fetchTeams();
};
</script>

<template>
  <div class="space-y-6">
    <!-- Error Alert -->
    <UAlert
      v-if="error"
      color="error"
      variant="soft"
      icon="i-lucide-alert-circle"
      title="Error loading teams"
      :description="error"
    />

    <!-- Stats Section -->
    <TeamsStats
      :total-teams="stats.totalTeams"
      :total-members="stats.totalMembers"
      :teams-with-officer="stats.teamsWithOfficer"
      :avg-members-per-team="stats.avgMembersPerTeam"
      :is-loading="isLoading"
    />

    <!-- Teams List Section -->
    <UPageCard
      :ui="{
        header: 'w-full',
      }"
    >
      <template #header>
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-lg font-semibold text-highlighted">Teams</h3>
            <p class="text-sm text-muted">Manage and view all teams in the system</p>
          </div>
          <UButton
            icon="i-lucide-refresh-cw"
            color="neutral"
            variant="outline"
            :loading="isLoading"
            @click="handleRefresh"
          >
            Refresh
          </UButton>
        </div>
      </template>

      <TeamsList :teams="teams" :is-loading="isLoading" />
    </UPageCard>
  </div>
</template>
