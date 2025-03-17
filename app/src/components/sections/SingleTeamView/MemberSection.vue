<template>
  <CardComponent title="Team Members List">
    <template #card-action>
      <ButtonUI
        v-if="teamStore.currentTeam?.ownerAddress == userDataStore.address"
        @click="
          () => {
            showAddMemberForm = !showAddMemberForm
          }
        "
        data-test="add-member-button"
        variant="primary"
        class="w-max"
      >
        <PlusCircleIcon class="size-6" /> Add a new Member
      </ButtonUI>
      <ModalComponent v-model="showAddMemberForm">
        <AddMemberForm
          v-if="teamStore.currentTeam?.id && showAddMemberForm"
          :teamId="teamStore.currentTeam?.id"
          @memberAdded="showAddMemberForm = false"
        />
      </ModalComponent>
    </template>
    <template #default>
      <div class="divider m-0"></div>
      <div class="overflow-x-auto">
        <TableComponent
          :rows="
            teamStore.currentTeam?.members.map((member: any, index: number) => {
              return { index: index + 1, ...member }
            })
          "
          :loading="teamStore.currentTeamMeta?.teamIsFetching"
          :columns="columns"
          data-test="members-table"
        >
          <template #member-data="{ row }">
            <UserComponent
              :user="{ name: row.name, address: row.address, avatarUrl: row.avatarUrl }"
            />
          </template>
          <template #wage-data=""> 20 h/week & 10 USD/h </template>
          <template
            #action-data="{ row }"
            v-if="teamStore.currentTeam?.ownerAddress === userDataStore.address"
          >
            <MemberAction
              :member="{ name: row.name, address: row.address }"
              :team-id="teamStore.currentTeam?.id"
            ></MemberAction>
          </template>
        </TableComponent>
      </div>
    </template>
  </CardComponent>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { PlusCircleIcon } from '@heroicons/vue/24/outline'
import AddMemberForm from '@/components/sections/SingleTeamView/forms/AddMemberForm.vue'
import ModalComponent from '@/components/ModalComponent.vue'
import { useUserDataStore } from '@/stores/user'
import ButtonUI from '@/components/ButtonUI.vue'
import CardComponent from '@/components/CardComponent.vue'
import TableComponent from '@/components/TableComponent.vue'
import UserComponent from '@/components/UserComponent.vue'
import MemberAction from './MemberAction.vue'
import { useTeamStore } from '@/stores'

const userDataStore = useUserDataStore()
const showAddMemberForm = ref(false)

const teamStore = useTeamStore()

const columns = computed(() => {
  const columns = [
    { key: 'index', label: '#' },
    { key: 'member', label: 'Member' },
    { key: 'wage', label: 'Wage' }
  ]
  if (teamStore.currentTeam?.ownerAddress == userDataStore.address) {
    columns.push({ key: 'action', label: 'Action' })
  }
  return columns
})
</script>
