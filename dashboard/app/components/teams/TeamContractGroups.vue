<script setup lang="ts">
import { computed } from 'vue'
import { useTeamOfficersQuery } from '~/queries/contract.query'
import { shortenAddress } from '~/utils/generalUtil'
import type { TeamContract } from '~/types'

const props = defineProps<{
  teamId: number
  // Officer-less, version-independent contracts (Safe, SafeDepositRouter).
  sharedContracts?: TeamContract[]
}>()

const { data: officers, isLoading, isError } = useTeamOfficersQuery(() => props.teamId)

// Only surface Officer generations that actually govern contracts.
const officerGroups = computed(() =>
  (officers.value ?? []).filter(o => (o.contracts?.length ?? 0) > 0)
)

const shared = computed(() => props.sharedContracts ?? [])

const hasAnything = computed(
  () => officerGroups.value.length > 0 || shared.value.length > 0
)
</script>

<template>
  <div class="space-y-5">
    <div v-if="isLoading" class="space-y-3">
      <USkeleton class="h-8 w-48 rounded-lg" />
      <USkeleton class="h-32 w-full rounded-lg" />
    </div>

    <div
      v-else-if="isError"
      class="flex items-center gap-1.5 text-sm text-error"
    >
      <UIcon name="i-lucide-triangle-alert" class="size-4" />
      Failed to load contract versions
    </div>

    <p v-else-if="!hasAnything" class="text-sm text-muted" data-test="no-contracts">
      No contracts deployed for this team yet.
    </p>

    <template v-else>
      <!-- One group per Officer generation, newest first. -->
      <section
        v-for="officer in officerGroups"
        :key="officer.id"
        class="rounded-xl border border-default overflow-hidden"
      >
        <div class="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-default bg-elevated/40">
          <UBadge
            :color="officer.isCurrent ? 'primary' : 'neutral'"
            variant="subtle"
            size="lg"
            class="font-semibold"
          >
            {{ officer.version || 'unknown' }}
          </UBadge>
          <UBadge
            v-if="officer.isCurrent"
            color="success"
            variant="soft"
            size="sm"
            icon="i-lucide-circle-check"
          >
            current
          </UBadge>
          <span class="text-sm text-muted">Officer</span>
          <a
            :href="`https://polygonscan.com/address/${officer.address}`"
            target="_blank"
            rel="noopener noreferrer"
            class="font-mono text-sm text-primary hover:underline"
          >
            {{ shortenAddress(officer.address) }}
          </a>
          <CopyButton :value="officer.address" label="Officer address copied" />
          <UBadge
            color="neutral"
            variant="subtle"
            size="sm"
            class="ml-auto"
          >
            {{ officer.contracts?.length ?? 0 }} contract{{ (officer.contracts?.length ?? 0) !== 1 ? 's' : '' }}
          </UBadge>
        </div>

        <ContractTable :contracts="officer.contracts ?? []" />
      </section>

      <!-- Version-independent contracts (survive Officer redeploys). -->
      <section
        v-if="shared.length"
        class="rounded-xl border border-default overflow-hidden"
      >
        <div class="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-default bg-elevated/40">
          <UIcon name="i-lucide-link" class="size-4 text-muted" />
          <h3 class="text-sm font-semibold text-highlighted">
            Shared (version-independent)
          </h3>
          <UBadge
            color="neutral"
            variant="subtle"
            size="sm"
            class="ml-auto"
          >
            {{ shared.length }} contract{{ shared.length !== 1 ? 's' : '' }}
          </UBadge>
        </div>

        <ContractTable :contracts="shared" />
      </section>
    </template>
  </div>
</template>
