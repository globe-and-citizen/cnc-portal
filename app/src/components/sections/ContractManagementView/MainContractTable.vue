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
        { accessorKey: 'address', header: 'Contract Address' },
        { accessorKey: 'owner', header: 'Owner' },
        { accessorKey: 'actions', header: 'Actions' }
      ]"
    >
      <template #address-cell="{ row: { original: row } }">
        <AddressToolTip :address="row.address" class="text-xs" />
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
import { ref, watch } from 'vue'
import UserComponent from '@/components/UserComponent.vue'
import { useTeamStore } from '@/stores/'
import { type User } from '@/types'
import AddressToolTip from '@/components/AddressToolTip.vue'
import MainContractActions from './MainContractActions.vue'
import { getTeamContracts } from '@/utils'

const teamStore = useTeamStore()
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const teamContracts = ref<any[]>([])

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
