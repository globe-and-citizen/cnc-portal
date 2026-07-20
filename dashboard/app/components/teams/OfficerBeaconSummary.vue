<script setup lang="ts">
import { useOfficerBeaconSummary } from '~/composables/useOfficerBeaconSummary'
import { shortenAddress } from '~/utils/generalUtil'
import type { Team } from '~/types'

const props = defineProps<{
  teams: Team[]
}>()

const { stats, isLoading } = useOfficerBeaconSummary(() => props.teams)

// Deterministic order for the per-version chips (known versions first, then
// whatever else shows up alphabetically).
const versionOrder = ['v0.11', 'v0.10', 'legacy', 'unknown']
const orderedVersions = (versions: Record<string, number>) =>
  Object.entries(versions).sort(([a], [b]) => {
    const ia = versionOrder.indexOf(a)
    const ib = versionOrder.indexOf(b)
    if (ia !== -1 || ib !== -1) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib)
    return a.localeCompare(b)
  })
</script>

<template>
  <div class="rounded-xl border border-default bg-elevated/30 p-4">
    <div class="flex items-center gap-2 mb-3">
      <UIcon name="i-lucide-radio-tower" class="size-4 text-muted" />
      <h3 class="text-sm font-semibold text-highlighted">
        Officer factory beacons
      </h3>
      <UBadge
        v-if="!isLoading"
        color="neutral"
        variant="subtle"
        size="sm"
      >
        {{ stats.length }}
      </UBadge>
    </div>

    <div v-if="isLoading" class="flex gap-3">
      <USkeleton class="h-24 w-64 rounded-lg" />
      <USkeleton class="h-24 w-64 rounded-lg opacity-60" />
    </div>

    <p v-else-if="!stats.length" class="text-sm text-muted">
      No officers deployed yet.
    </p>

    <div v-else class="flex flex-wrap gap-3">
      <div
        v-for="stat in stats"
        :key="stat.beacon ?? 'unknown'"
        class="rounded-lg border border-default bg-default p-3 min-w-64"
      >
        <!-- Beacon address -->
        <div class="flex items-center gap-1.5">
          <UIcon name="i-lucide-radio-tower" class="size-4 text-dimmed shrink-0" />
          <template v-if="stat.beacon">
            <a
              :href="`https://polygonscan.com/address/${stat.beacon}`"
              target="_blank"
              rel="noopener noreferrer"
              class="font-mono text-sm text-primary hover:underline"
            >
              {{ shortenAddress(stat.beacon) }}
            </a>
            <CopyButton :value="stat.beacon" label="Beacon address copied" />
          </template>
          <span v-else class="text-sm text-muted italic">Unknown beacon</span>

          <UBadge
            color="neutral"
            variant="subtle"
            size="sm"
            class="ml-auto"
          >
            {{ stat.total }} officer{{ stat.total !== 1 ? 's' : '' }}
          </UBadge>
        </div>

        <!-- Current vs legacy -->
        <div class="mt-2.5 flex items-center gap-2">
          <UBadge color="success" variant="subtle" icon="i-lucide-circle-check">
            {{ stat.current }} current
          </UBadge>
          <UBadge color="neutral" variant="subtle" icon="i-lucide-history">
            {{ stat.legacy }} legacy
          </UBadge>
        </div>

        <!-- Per-version breakdown -->
        <div class="mt-2 flex flex-wrap items-center gap-1.5">
          <UBadge
            v-for="[version, count] in orderedVersions(stat.versions)"
            :key="version"
            color="primary"
            variant="soft"
            size="sm"
          >
            {{ version }}: {{ count }}
          </UBadge>
        </div>
      </div>
    </div>
  </div>
</template>
