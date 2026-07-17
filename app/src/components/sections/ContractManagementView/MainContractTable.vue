<template>
  <div id="team-contracts" class="mt-4 overflow-x-auto">
    <UTable
      :data="
        teamContracts.map((contract, index) => ({
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
        <UBadge v-if="officerVersion" color="primary" variant="subtle" size="sm">
          {{ officerVersion }}
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
        <UserComponent
          :user="
            getUser(row.owner) //teamStore.currentTeam?.members.find((member) => member.address == row.owner) as User
          "
        />
      </template>

      <template #actions-cell="{ row: { original: row } }">
        <MainContractActions
          @contract-status-changed="
            async () =>
              (teamContracts = teamStore.currentTeam?.teamContracts
                ? (await getTeamContracts(teamStore.currentTeam?.teamContracts)) || []
                : [])
          "
          :row="row"
        />
      </template>
    </UTable>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import UserComponent from '@/components/UserComponent.vue'
import { useTeamStore } from '@/stores/'
import { type User } from '@/types'
import AddressToolTip from '@/components/AddressToolTip.vue'
import MainContractActions from './MainContractActions.vue'
import MainContractBalanceCell from './MainContractBalanceCell.vue'
import { getTeamContracts } from '@/utils'

const teamStore = useTeamStore()
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const teamContracts = ref<any[]>([])

// Main contracts all belong to the current Officer generation, so they share
// its version tag.
const officerVersion = computed(() => teamStore.currentTeam?.currentOfficer?.version ?? null)

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

watch(
  () => teamStore.currentTeam?.teamContracts,
  async (newContracts) => {
    if (newContracts && newContracts?.length > 0) {
      teamContracts.value = (await getTeamContracts(newContracts)) || []
    }
  },
  { immediate: true }
)
</script>
