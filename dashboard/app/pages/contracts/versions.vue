<script setup lang="ts">
import { computed, ref } from 'vue'
import { useTeamsQuery } from '~/queries/team.query'
import { useSyncOfficerVersionsMutation } from '~/queries/contract.query'
import { useOfficerVersionAudit } from '~/composables/useOfficerVersionAudit'
import type { OfficerVersionSyncReport } from '~/api/contract'

// Archived teams are hidden by default, but the sync walks every Officer row —
// ask for them so the simulation covers exactly what the endpoint will touch.
const { data: teams, isLoading: isLoadingTeams } = useTeamsQuery({ showArchived: true })

const { rows, total, toUpdate, aligned, unresolved, isLoading: isAuditing }
  = useOfficerVersionAudit(teams)

const isLoading = computed(() => isLoadingTeams.value || isAuditing.value)

const changesOnly = ref(true)
const visibleRows = computed(() =>
  changesOnly.value ? rows.value.filter(row => row.status === 'update') : rows.value
)

const stats = computed(() => [
  { title: 'Officers scanned', icon: 'i-lucide-shield', value: total.value },
  { title: 'Will change', icon: 'i-lucide-refresh-cw', value: toUpdate.value },
  { title: 'Already aligned', icon: 'i-lucide-check-circle', value: aligned.value },
  { title: 'Unresolved', icon: 'i-lucide-circle-help', value: unresolved.value }
])

const isConfirmOpen = ref(false)
const report = ref<OfficerVersionSyncReport | null>(null)
const sync = useSyncOfficerVersionsMutation()

// What the backend actually wrote, so the table can flag any row it resolved
// differently from this preview — the signal that the two implementations of
// the detection have drifted apart.
const applied = computed(() => {
  if (!report.value) return undefined
  return new Map(report.value.results.map(result => [result.officerId, result.to]))
})

const divergences = computed(() => {
  if (!applied.value) return 0
  return rows.value.filter(
    row => applied.value!.has(row.officerId)
      && applied.value!.get(row.officerId) !== row.detectedVersion
  ).length
})

const runSync = () => {
  sync.mutate({}, {
    onSuccess: (result) => {
      report.value = result
      isConfirmOpen.value = false
    }
  })
}
</script>

<template>
  <div class="space-y-6">
    <UPageCard :ui="{ header: 'w-full' }">
      <template #header>
        <div class="flex items-start justify-between gap-4 w-full">
          <div>
            <h3 class="text-lg font-semibold text-highlighted">
              Officer version sync
            </h3>
            <p class="text-sm text-muted">
              Every Officer is probed on-chain — <code>version()</code> first, then its
              ERC-1967 beacon matched against the version registry — and compared with the
              version stored in the database. Nothing is written until you run the sync.
            </p>
          </div>
          <UButton
            icon="i-lucide-play"
            :disabled="isLoading || toUpdate === 0"
            data-test="run-sync-btn"
            @click="isConfirmOpen = true"
          >
            Run sync
          </UButton>
        </div>
      </template>

      <UPageGrid class="lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-px">
        <UPageCard
          v-for="stat in stats"
          :key="stat.title"
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
          <USkeleton v-if="isLoading" class="h-8 w-16" />
          <span v-else class="text-2xl font-semibold text-highlighted">
            {{ stat.value }}
          </span>
        </UPageCard>
      </UPageGrid>
    </UPageCard>

    <UAlert
      v-if="unresolved > 0"
      color="warning"
      variant="soft"
      icon="i-lucide-circle-help"
      title="Some Officers could not be identified"
      :description="`${unresolved} Officer(s) answer neither version() nor a beacon this registry knows. The sync leaves them exactly as they are.`"
    />

    <UAlert
      v-if="report && divergences > 0"
      color="error"
      variant="soft"
      icon="i-lucide-triangle-alert"
      title="The sync disagreed with this simulation"
      :description="`${divergences} Officer(s) were written with a version this page did not predict. The dashboard and backend detection have drifted — compare useOfficerVersionAudit.ts with backend/src/utils/officerVersion.ts.`"
    />

    <UAlert
      v-else-if="report"
      color="success"
      variant="soft"
      icon="i-lucide-check-circle"
      title="Sync complete"
      :description="`${report.updated} updated, ${report.unchanged} already aligned, ${report.unresolved} unresolved — all matching this simulation.`"
    />

    <UPageCard :ui="{ header: 'w-full' }">
      <template #header>
        <div class="flex items-center justify-between gap-4 w-full">
          <h3 class="text-lg font-semibold text-highlighted">
            Simulation
          </h3>
          <UCheckbox v-model="changesOnly" label="Show changes only" />
        </div>
      </template>

      <USkeleton v-if="isLoading" class="h-64 w-full" />
      <p v-else-if="visibleRows.length === 0" class="text-sm text-muted" data-test="no-changes">
        {{ changesOnly ? 'Every Officer version already matches the chain.' : 'No Officers found.' }}
      </p>
      <OfficerVersionTable v-else :rows="visibleRows" :applied="applied" />
    </UPageCard>

    <UModal v-model:open="isConfirmOpen" title="Realign Officer versions">
      <template #body>
        <div class="space-y-4">
          <p class="text-sm text-muted">
            This rewrites <code>TeamOfficer.version</code> for
            <strong>{{ toUpdate }}</strong> Officer(s) across
            {{ total }} scanned rows. Officers whose generation could not be resolved are
            left untouched.
          </p>

          <UAlert
            v-if="sync.error.value"
            color="error"
            variant="soft"
            icon="i-lucide-alert-circle"
            :description="sync.error.value.message"
          />

          <div class="flex justify-end gap-2">
            <UButton
              color="neutral"
              variant="ghost"
              :disabled="sync.isPending.value"
              @click="isConfirmOpen = false"
            >
              Cancel
            </UButton>
            <UButton
              :loading="sync.isPending.value"
              data-test="confirm-sync-btn"
              @click="runSync"
            >
              Run sync
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
