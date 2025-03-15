<template>
  <CardComponent title="Team Members List">
    <template #card-action>
      <ButtonUI
        v-if="team.ownerAddress == userDataStore.address"
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
          v-if="team.id && showAddMemberForm"
          :teamId="team.id"
          @memberAdded="showAddMemberForm = false"
        />
      </ModalComponent>
    </template>
    <template #default>
      <div class="divider m-0"></div>
      <div class="overflow-x-auto">
        <TableComponent
          :rows="
            team.members.map((member: any, index: number) => {
              return { index: index + 1, ...member }
            })
          "
          :columns="columns"
          data-test="members-table"
        >
          <template #member-data="{ row }">
            <UserComponent
              :user="{ name: row.name, address: row.address, avatarUrl: row.avatarUrl }"
            />
          </template>
          <template #wage-data=""> 20 h/week & 10 USD/h </template>
          <template #action-data="{ row }" v-if="team.ownerAddress === userDataStore.address">
            <MemberAction
              :member="{ name: row.name, address: row.address }"
              :team-id="team.id"
            ></MemberAction>
          </template>
        </TableComponent>
      </div>
    </template>
  </CardComponent>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { PlusCircleIcon } from '@heroicons/vue/24/outline'
import AddMemberForm from '@/components/sections/SingleTeamView/forms/AddMemberForm.vue'
import ModalComponent from '@/components/ModalComponent.vue'
import { useUserDataStore } from '@/stores/user'
import ButtonUI from '@/components/ButtonUI.vue'
import CardComponent from '@/components/CardComponent.vue'
import TableComponent from '@/components/TableComponent.vue'
import UserComponent from '@/components/UserComponent.vue'
import MemberAction from './MemberAction.vue'

const userDataStore = useUserDataStore()
const showAddMemberForm = ref(false)

const props = defineProps(['team'])

const columns = ref([
  { key: 'index', label: '#' },
  { key: 'member', label: 'Member' },
  { key: 'wage', label: 'Wage' }
])
// v-if="team.ownerAddress == userDataStore.address"
if (props.team?.ownerAddress == userDataStore.address) {
  columns.value.push({ key: 'action', label: 'Action' })
}
</script>
