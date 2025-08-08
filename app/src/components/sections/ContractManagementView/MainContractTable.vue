<template>
  <div id="team-contracts" class="overflow-x-auto mt-4">
    <TableComponent
      :rows="
        teamContracts.map((contract, index) => ({
          ...contract,
          index: index + 1
        }))
      "
      :columns="[
        { key: 'index', label: '#' },
        { key: 'type', label: 'Type' },
        { key: 'address', label: 'Contract Address' },
        { key: 'owner', label: 'Owner' },
        { key: 'actions', label: 'Actions' }
      ]"
    >
      <template #address-data="{ row }">
        <AddressToolTip :address="row.address" class="text-xs" />
      </template>

      <template #owner-data="{ row }">
        <UserComponent
          :user="
            getUser(row.owner) //teamStore.currentTeam?.members.find((member) => member.address == row.owner) as User
          "
        />
      </template>

      <template #actions-data="{ row }">
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
    </TableComponent>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import TableComponent from '@/components/TableComponent.vue'
import UserComponent from '@/components/UserComponent.vue'
import { useTeamStore } from '@/stores/'
import { type User } from '@/types'
import AddressToolTip from '@/components/AddressToolTip.vue'
import MainContractActions from './MainContractActions.vue'
import { getTeamContracts } from '@/utils'

const teamStore = useTeamStore()
const teamContracts = ref<object[]>([])

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
