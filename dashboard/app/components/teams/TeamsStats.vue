<script setup lang="ts">
defineProps<{
  totalTeams: number
  totalMembers: number
  teamsWithOfficer: number
  avgMembersPerTeam: number
  isLoading?: boolean
}>()

const statItems = computed(() => [
  {
    title: 'Total Teams',
    icon: 'i-lucide-users',
    value: 0,
    key: 'totalTeams'
  },
  {
    title: 'Total Members',
    icon: 'i-lucide-user',
    value: 0,
    key: 'totalMembers'
  },
  {
    title: 'Teams with Officer',
    icon: 'i-lucide-shield',
    value: 0,
    key: 'teamsWithOfficer'
  },
  {
    title: 'Avg Members/Team',
    icon: 'i-lucide-chart-bar',
    value: 0,
    key: 'avgMembersPerTeam'
  }
])
</script>

<template>
  <UPageGrid class="lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-px mb-6">
    <UPageCard
      v-for="(stat, index) in statItems"
      :key="index"
      :icon="stat.icon"
      :title="stat.title"
      variant="subtle"
      :ui="{
        container: 'gap-y-1.5',
        wrapper: 'items-start',
        leading: 'p-2.5 rounded-full bg-primary/10 ring ring-inset ring-primary/25 flex-col',
        title: 'font-normal text-muted text-xs uppercase'
      }"
      class="lg:rounded-none first:rounded-l-lg last:rounded-r-lg hover:z-1"
    >
      <div class="flex items-center gap-2">
        <USkeleton v-if="isLoading" class="h-8 w-16" />
        <span v-else class="text-2xl font-semibold text-highlighted">
          {{ stat.key === 'totalTeams' ? totalTeams
            : stat.key === 'totalMembers' ? totalMembers
              : stat.key === 'teamsWithOfficer' ? teamsWithOfficer
                : avgMembersPerTeam }}
        </span>
      </div>
    </UPageCard>
  </UPageGrid>
</template>
