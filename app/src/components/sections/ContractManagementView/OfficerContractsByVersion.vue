<template>
  <UCard class="w-full" data-test="officer-contracts-by-version">
    <template #header>
      <div class="flex items-center gap-2">
        <span>Contracts by Officer version</span>
        <UIcon
          v-if="isPending"
          name="i-lucide-loader-circle"
          class="text-primary h-4 w-4 animate-spin"
        />
      </div>
    </template>

    <div v-if="isError" class="text-error flex items-center gap-2 text-sm">
      <UIcon name="i-lucide-triangle-alert" class="h-4 w-4" />
      Failed to load Officer contracts
    </div>

    <p v-else-if="!isPending && !officers?.length" class="text-sm text-gray-500">
      No Officer deployed for this team yet.
    </p>

    <div v-else class="flex flex-col gap-6">
      <!-- One block per Officer generation, newest first. -->
      <div v-for="officer in officers" :key="officer.id" class="flex flex-col gap-3">
        <div class="flex flex-wrap items-center gap-2">
          <UBadge :color="officer.isCurrent ? 'primary' : 'neutral'" variant="subtle">
            {{ officer.version || 'unknown' }}
          </UBadge>
          <UBadge v-if="officer.isCurrent" color="success" variant="soft" size="sm">
            current
          </UBadge>
          <span class="text-sm text-gray-500">Officer</span>
          <AddressToolTip :address="officer.address" class="text-xs" />
        </div>

        <div class="overflow-x-auto">
          <UTable
            :data="rows(officer)"
            :columns="[
              { accessorKey: 'index', header: '#' },
              { accessorKey: 'type', header: 'Type' },
              { accessorKey: 'address', header: 'Contract Address' },
              { accessorKey: 'balance', header: 'Balance' }
            ]"
          >
            <template #address-cell="{ row: { original: row } }">
              <AddressToolTip :address="row.address" class="text-xs" />
            </template>

            <template #balance-cell="{ row: { original: row } }">
              <MainContractBalanceCell
                v-if="holdsValue(row.type)"
                :address="row.address as Address"
              />
              <span v-else class="text-xs text-gray-400">—</span>
            </template>
          </UTable>
        </div>
      </div>
    </div>
  </UCard>
</template>

<script setup lang="ts">
import type { Address } from 'viem'
import { useTeamStore } from '@/stores'
import { useGetTeamOfficersQuery, type TeamOfficerWithContracts } from '@/queries/contract.queries'
import AddressToolTip from '@/components/AddressToolTip.vue'
import MainContractBalanceCell from './MainContractBalanceCell.vue'

const teamStore = useTeamStore()

const {
  data: officers,
  isPending,
  isError
} = useGetTeamOfficersQuery({
  queryParams: { teamId: () => teamStore.currentTeamId ?? '' }
})

// Only these types custody funds — show a balance for them only.
const VALUE_HOLDING_TYPES = new Set([
  'Bank',
  'ExpenseAccountEIP712',
  'CashRemunerationEIP712',
  'Safe'
])
const holdsValue = (type: string) => VALUE_HOLDING_TYPES.has(type)

const rows = (officer: TeamOfficerWithContracts) =>
  officer.contracts.map((contract, index) => ({ ...contract, index: index + 1 }))
</script>
