<script setup lang="ts">
import { computed } from 'vue'
import dayjs from 'dayjs'
import type { Address } from 'viem'
import { useTeamQuery } from '~/queries/team.query'

const route = useRoute()
const teamId = computed(() => Number(route.params.id))

const { data: team, isLoading, isError } = useTeamQuery(teamId)

const contractRows = computed(() =>
  (team.value?.teamContracts ?? []).map((contract, index) => ({
    ...contract,
    index: index + 1
  }))
)
</script>

<template>
  <div class="space-y-6">
    <UButton
      to="/teams"
      icon="i-lucide-arrow-left"
      color="neutral"
      variant="ghost"
      label="Back to teams"
      class="-ml-2.5"
    />

    <div v-if="isError">
      <UAlert
        color="error"
        variant="soft"
        icon="i-lucide-alert-circle"
        title="Failed to load team"
        description="We couldn't load this team. Please try again later."
      />
    </div>

    <div v-else-if="isLoading" class="space-y-4">
      <USkeleton class="h-24 w-full rounded-xl" />
      <USkeleton class="h-64 w-full rounded-xl" />
    </div>

    <template v-else-if="team">
      <!-- Team header -->
      <UPageCard :ui="{ header: 'w-full' }">
        <template #header>
          <div class="flex items-start justify-between gap-4">
            <div>
              <div class="flex items-center gap-2">
                <h1 class="text-xl font-semibold text-highlighted">
                  {{ team.name }}
                </h1>
                <UBadge color="neutral" variant="subtle" size="sm">
                  #{{ team.id }}
                </UBadge>
                <UBadge
                  v-if="team.currentOfficer?.version"
                  color="primary"
                  variant="subtle"
                  size="sm"
                >
                  {{ team.currentOfficer.version }}
                </UBadge>
              </div>
              <p v-if="team.description" class="mt-1 text-sm text-muted">
                {{ team.description }}
              </p>
            </div>
          </div>
        </template>

        <dl class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <dt class="text-xs text-muted mb-1">
              Owner
            </dt>
            <dd>
              <UserIdentity :address="team.ownerAddress as Address" />
            </dd>
          </div>
          <div>
            <dt class="text-xs text-muted mb-1">
              Created
            </dt>
            <dd class="text-sm">
              {{ dayjs(team.createdAt).format('MMM D, YYYY') }}
            </dd>
          </div>
        </dl>
      </UPageCard>

      <!-- Contracts -->
      <UPageCard :ui="{ header: 'w-full' }">
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-file-code-2" class="size-5 text-muted" />
            <h2 class="text-lg font-semibold text-highlighted">
              Contracts
            </h2>
            <UBadge color="neutral" variant="subtle" size="sm">
              {{ contractRows.length }}
            </UBadge>
          </div>
        </template>

        <p
          v-if="contractRows.length === 0"
          class="text-sm text-muted"
          data-test="no-contracts"
        >
          No contracts deployed for this team yet.
        </p>

        <UTable
          v-else
          :data="contractRows"
          :columns="[
            { accessorKey: 'index', header: '#' },
            { accessorKey: 'type', header: 'Type' },
            { accessorKey: 'address', header: 'Contract Address' },
            { accessorKey: 'deployer', header: 'Deployer' }
          ]"
        >
          <template #type-cell="{ row }">
            <UBadge color="neutral" variant="subtle">
              {{ row.original.type }}
            </UBadge>
          </template>

          <template #address-cell="{ row }">
            <AddressLink :address="row.original.address" label="Contract address copied" />
          </template>

          <template #deployer-cell="{ row }">
            <UserIdentity :address="row.original.deployer as Address" />
          </template>
        </UTable>
      </UPageCard>
    </template>
  </div>
</template>
