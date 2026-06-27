<template>
  <UBreadcrumb :items="breadcrumbItems">
    <template #loader>
      <USkeleton class="h-4 w-20" data-test="loader" />
    </template>
  </UBreadcrumb>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useTeamStore } from '@/stores/teamStore'

const route = useRoute()
const teamStore = useTeamStore()

/**
 * Breadcrumb rendered in the dashboard navbar.
 *
 * - Companies list (no team in the route): a single `[Page]` crumb.
 * - Inside a team: `[Team name] > [Page]`.
 * - While the team is loading: a skeleton stands in for its name.
 * - If the team fails to load: fall back to the `[Page]` crumb only.
 */
const breadcrumbItems = computed(() => {
  const pageLabel = route.meta.name as string
  const teamId = route.params.id as string | undefined

  // Companies list and other team-less pages: just the page label.
  if (!teamId) {
    return [{ label: pageLabel }]
  }

  const teamMeta = teamStore.currentTeamMeta

  if (teamMeta?.isPending) {
    return [{ slot: 'loader' as const }, { label: pageLabel }]
  }

  if (teamMeta?.data) {
    return [{ label: teamMeta.data.name }, { label: pageLabel }]
  }

  return [{ label: pageLabel }]
})
</script>
