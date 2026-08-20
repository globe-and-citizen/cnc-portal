<script setup lang="ts">
import type { OfficerVersionAuditRow } from '~/composables/useOfficerVersionAudit'

defineProps<{
  rows: OfficerVersionAuditRow[]
  // Versions actually written by the last sync, keyed by officer id. Present
  // only after a run — used to flag any row the backend resolved differently
  // from this preview.
  applied?: Map<number, string | null>
}>()

const STATUS_STYLE = {
  update: { color: 'warning' as const, label: 'will change' },
  aligned: { color: 'success' as const, label: 'aligned' },
  unresolved: { color: 'neutral' as const, label: 'unresolved' }
}
</script>

<template>
  <UTable
    :data="rows"
    :columns="[
      { accessorKey: 'teamName', header: 'Team' },
      { accessorKey: 'address', header: 'Officer' },
      { accessorKey: 'generation', header: 'Generation' },
      { accessorKey: 'change', header: 'Stored → detected' },
      { accessorKey: 'source', header: 'Detected via' },
      { accessorKey: 'status', header: 'Status' }
    ]"
    data-test="officer-version-table"
  >
    <template #teamName-cell="{ row }">
      <ULink :to="`/teams/${row.original.teamId}`" class="text-highlighted">
        {{ row.original.teamName }}
      </ULink>
    </template>

    <template #address-cell="{ row }">
      <AddressLink :address="row.original.address" label="Officer address copied" />
    </template>

    <template #generation-cell="{ row }">
      <UBadge
        :color="row.original.isCurrent ? 'success' : 'neutral'"
        variant="soft"
        size="sm"
      >
        {{ row.original.isCurrent ? 'current' : 'legacy' }}
      </UBadge>
    </template>

    <template #change-cell="{ row }">
      <div class="flex items-center gap-2">
        <UBadge color="neutral" variant="subtle">
          {{ row.original.storedVersion || '—' }}
        </UBadge>
        <UIcon name="i-lucide-arrow-right" class="size-4 text-dimmed shrink-0" />
        <UBadge
          :color="row.original.status === 'update' ? 'primary' : 'neutral'"
          variant="subtle"
        >
          {{ row.original.detectedVersion || '—' }}
        </UBadge>
        <UTooltip
          v-if="applied?.has(row.original.officerId)
            && applied.get(row.original.officerId) !== row.original.detectedVersion"
          :text="`The sync wrote ${applied.get(row.original.officerId) ?? 'nothing'} — the preview and the backend disagree.`"
        >
          <UIcon name="i-lucide-triangle-alert" class="size-4 text-error shrink-0" />
        </UTooltip>
      </div>
    </template>

    <template #source-cell="{ row }">
      <span class="text-sm text-muted">
        {{ row.original.source === 'onchain' ? 'version()' : row.original.source === 'beacon' ? 'beacon' : '—' }}
      </span>
    </template>

    <template #status-cell="{ row }">
      <UBadge :color="STATUS_STYLE[row.original.status].color" variant="soft" size="sm">
        {{ STATUS_STYLE[row.original.status].label }}
      </UBadge>
    </template>
  </UTable>
</template>
