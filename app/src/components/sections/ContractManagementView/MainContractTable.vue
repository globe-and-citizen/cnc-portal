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
            teamStore.currentTeam?.members.find((member) => member.address == row.owner) as User
          "
        />
      </template>

      <template #actions-data="{ row }">
        <MainContractActions
          @contract-status-changed="
            async () => (teamContracts = (await getTeamContracts(contracts)) || [])
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
import { type TeamContract, type User } from '@/types'
import AddressToolTip from '@/components/AddressToolTip.vue'
import MainContractActions from './MainContractActions.vue'
import { getTeamContracts } from '@/utils'

// Define props
const props = defineProps<{ contracts: TeamContract[]; teamId: string }>()
const teamStore = useTeamStore()
const teamContracts = ref<object[]>([])

watch(
  () => props.contracts,
  async (newContracts) => {
    if (newContracts.length > 0) {
      teamContracts.value = (await getTeamContracts(props.contracts)) || []
      console.log('teamContracts.value: ', teamContracts.value)
    }
  },
  { immediate: true }
)
</script>
