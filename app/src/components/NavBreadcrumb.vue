<template>
  <UBreadcrumb :items="breadcrumbItems">
    <template #separator>
      <span class="text-dimmed">/</span>
    </template>
    <template #item-trailing="{ item }">
      <UBadge
        v-if="(item as Crumb).role"
        :color="(item as Crumb).role === 'Owner' ? 'primary' : 'secondary'"
        variant="solid"
        size="sm"
        class="ml-0.5"
        >{{ (item as Crumb).role }}</UBadge
      >
    </template>
    <template #loader>
      <USkeleton class="h-4 w-24" data-test="loader" />
    </template>
  </UBreadcrumb>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useUserDataStore, useTeamStore } from '@/stores'

const route = useRoute()
const userStore = useUserDataStore()
const teamStore = useTeamStore()

type Crumb = {
  label?: string
  to?: string
  role?: 'Owner' | 'Employee'
  slot?: 'loader'
}

/**
 * Breadcrumb rendered in the dashboard navbar.
 *
 * - Companies list (no team in the route): a single `Companies` crumb.
 * - Inside a team: `Companies / Team [role] / Page`, where `Companies` and the
 *   team name are links, and a role badge (Owner/Employee) sits by the team name.
 * - While the team is loading: a skeleton stands in for its name.
 * - If the team fails to load: fall back to `Companies / Page`.
 */
const breadcrumbItems = computed<Crumb[]>(() => {
  const pageLabel = route.meta.name as string
  const teamId = route.params.id as string | undefined

  // Companies list and other team-less pages: just the page label.
  if (!teamId) {
    return [{ label: pageLabel }]
  }

  const companies: Crumb = { label: 'Companies', to: '/teams' }
  const teamMeta = teamStore.currentTeamMeta

  if (teamMeta?.isPending) {
    return [companies, { slot: 'loader' }, { label: pageLabel }]
  }

  if (teamMeta?.data) {
    const owner =
      !!teamMeta.data.ownerAddress &&
      !!userStore.address &&
      teamMeta.data.ownerAddress.toLowerCase() === userStore.address.toLowerCase()
    return [
      companies,
      { label: teamMeta.data.name, to: `/teams/${teamId}`, role: owner ? 'Owner' : 'Employee' },
      { label: pageLabel }
    ]
  }

  return [companies, { label: pageLabel }]
})
</script>
