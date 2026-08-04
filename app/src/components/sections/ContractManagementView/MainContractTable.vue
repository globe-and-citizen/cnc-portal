<template>
  <div>
    <UTable
      class="hidden md:table"
      :data="
        enrichedContracts.map((contract, index) => ({
          ...contract,
          index: index + 1
        }))
      "
      :columns="columns"
    >
      <template #version-cell>
        <UBadge v-if="version" color="primary" variant="subtle" size="sm">
          {{ version }}
        </UBadge>
        <span v-else class="text-xs text-gray-400">—</span>
      </template>

      <template #address-cell="{ row: { original: row } }">
        <AddressToolTip :address="row.address" class="text-xs" />
      </template>

      <template #balance-cell="{ row: { original: row } }">
        <MainContractBalanceCell v-if="holdsValue(row.type)" :address="row.address" />
        <span v-else class="text-xs text-gray-400">—</span>
      </template>

      <template #owner-cell="{ row: { original: row } }">
        <UserComponent :user="getUser(row.owner)" />
      </template>

      <template v-if="showActions" #actions-cell="{ row: { original: row } }">
        <MainContractActions @contract-status-changed="refresh" :row="row" />
      </template>
    </UTable>

    <div class="space-y-3 md:hidden">
      <UCard v-for="contract in enrichedContracts" :key="contract.address" variant="subtle">
        <div class="space-y-4">
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="text-highlighted font-medium">{{ contract.type }}</p>
              <AddressToolTip :address="contract.address" :slice="true" class="mt-1 text-xs" />
            </div>
            <UBadge v-if="version" color="primary" variant="subtle" size="sm">
              {{ version }}
            </UBadge>
          </div>

          <dl class="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt class="text-muted">Balance</dt>
              <dd class="text-default mt-1">
                <MainContractBalanceCell
                  v-if="holdsValue(contract.type)"
                  :address="contract.address"
                />
                <span v-else>—</span>
              </dd>
            </div>
            <div>
              <dt class="text-muted">Owner</dt>
              <dd class="mt-1"><UserComponent :user="getUser(contract.owner)" /></dd>
            </div>
          </dl>

          <div v-if="showActions" class="border-default border-t pt-3">
            <MainContractActions @contract-status-changed="refresh" :row="contract" />
          </div>
        </div>
      </UCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import UserComponent from '@/components/UserComponent.vue'
import { useTeamStore } from '@/stores/'
import { type User } from '@/types'
import type { TeamContract } from '@/types/teamContract'
import AddressToolTip from '@/components/AddressToolTip.vue'
import MainContractActions from './MainContractActions.vue'
import MainContractBalanceCell from './MainContractBalanceCell.vue'
import { getTeamContracts } from '@/utils'

// Raw contracts to display, and the version tag of the generation they belong
// to. Rendered identically for the current and legacy Officer generations.
const props = withDefaults(
  defineProps<{
    contracts: Array<{ address: string; type: string; deployer: string }>
    version: string | null
    showActions?: boolean
  }>(),
  { showActions: true }
)

const showActions = computed(() => props.showActions)
const columns = computed(() => [
  { accessorKey: 'index', header: '#' },
  { accessorKey: 'type', header: 'Type' },
  { accessorKey: 'version', header: 'Version' },
  { accessorKey: 'address', header: 'Contract Address' },
  { accessorKey: 'balance', header: 'Balance' },
  { accessorKey: 'owner', header: 'Owner' },
  ...(showActions.value ? [{ accessorKey: 'actions', header: 'Actions' }] : [])
])

const teamStore = useTeamStore()
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const enrichedContracts = ref<any[]>([])

// Only these contract types custody funds — show a balance for them only.
const VALUE_HOLDING_TYPES = new Set([
  'Bank',
  'ExpenseAccountEIP712',
  'CashRemunerationEIP712',
  'Safe'
])
const holdsValue = (type: string) => VALUE_HOLDING_TYPES.has(type)

const getUser = (address: string): User => {
  if (address === teamStore.getContractAddressByType('BoardOfDirectors'))
    return { name: 'Board of Directors', address }
  else
    return (
      teamStore.currentTeam?.members.find((member) => member.address === address) || {
        name: 'Unknown',
        address
      }
    )
}

const refresh = async () => {
  enrichedContracts.value =
    (await getTeamContracts(props.contracts as unknown as TeamContract[])) || []
}

watch(
  () => props.contracts,
  async (newContracts) => {
    if (newContracts?.length) {
      enrichedContracts.value =
        (await getTeamContracts(newContracts as unknown as TeamContract[])) || []
    } else {
      enrichedContracts.value = []
    }
  },
  { immediate: true }
)
</script>
