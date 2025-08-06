<template>
  <div id="team-contracts" class="overflow-x-auto mt-4">
    <TableComponent
      :rows="
        contracts.map((contract, index) => ({
          ...contract,
          index: index + 1
        }))
      "
      :columns="[
        { key: 'index', label: '#' },
        { key: 'type', label: 'Type' },
        { key: 'address', label: 'Contract Address' },
        { key: 'owner', label: 'Owner' },
        { key: 'actions', label: 'Actions' } /*,
        { key: 'events', label: 'Events' }*/
      ]"
    >
      <template #address-data="{ row }">
        <AddressToolTip :address="row.address" class="text-xs" />
      </template>

      <template #owner-data="{ row }">
        <UserComponent
          :user="
            teamStore.currentTeam?.members.find(
              (member) => member.address == userStore.address
            ) as User
          "
        />
      </template>

      <template #actions-data="{ row }">
        <div class="flex items-center gap-2">
          <ButtonUI variant="info" size="sm">
            <IconifyIcon :icon="`heroicons:play-solid`" />
          </ButtonUI>
          <ButtonUI
            variant="success"
            :outline="true"
            size="sm"
            @click="() => console.log('Transferring ownership...')"
            >Transfer Ownership</ButtonUI
          >
        </div>
      </template>
    </TableComponent>
  </div>
</template>

<script setup lang="ts">
import { Icon as IconifyIcon } from '@iconify/vue'
import TableComponent from '@/components/TableComponent.vue'
import ButtonUI from '@/components/ButtonUI.vue'
import UserComponent from '@/components/UserComponent.vue'
import { useTeamStore, useUserDataStore } from '@/stores/'
import { type TeamContract, type User } from '@/types'
import AddressToolTip from '@/components/AddressToolTip.vue'

// Define props
defineProps<{ contracts: TeamContract[]; teamId: string }>()
const teamStore = useTeamStore()
const userStore = useUserDataStore()
</script>
