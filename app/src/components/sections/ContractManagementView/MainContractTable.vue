<template>
  <div class="overflow-x-auto">
    <UTable
      :data="
        enrichedContracts.map((contract, index) => ({
          ...contract,
          index: index + 1
        }))
      "
      :columns="[
        { accessorKey: 'index', header: '#' },
        { accessorKey: 'type', header: 'Type' },
        { accessorKey: 'version', header: 'Version' },
        { accessorKey: 'address', header: 'Contract Address' },
        { accessorKey: 'balance', header: 'Balance' },
        { accessorKey: 'owner', header: 'Owner' },
        { accessorKey: 'actions', header: 'Actions' }
      ]"
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

      <template #actions-cell="{ row: { original: row } }">
        <MainContractActions @contract-status-changed="refresh" :row="row" />
      </template>
    </UTable>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
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
const props = defineProps<{
  contracts: Array<{ address: string; type: string; deployer: string }>
  version: string | null
}>()

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
