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
        <AddMemberForm v-if="teamId" :teamId="teamId" @memberAdded="showAddMemberForm = false" />
      </ModalComponent>
    </template>
    <template #default>
      <div class="divider m-0"></div>
      <div class="overflow-x-auto">
        <TableComponent
          :rows="team.members"
          :columns="columns"
          :loading="teamIsFetching"
          data-test="members-table"
        >
          <template #member-data="{ row }">
            <UserComponent
              :user="{ name: row.name, address: row.address, avatarUrl: row.avatarUrl }"
            />
          </template>
          <template #wage-data=""> 20 h/week & 10 USD/h </template>
          <template #action-data="{ row }" v-if="team.ownerAddress === userDataStore.address">
            <div class="flex flex-wrap gap-2">
              <ButtonUI
                variant="error"
                size="sm"
                @click="() => (row.showDeleteMemberConfirmModal = true)"
                data-test="delete-member-button"
              >
                <TrashIcon class="size-4" />
              </ButtonUI>
              <ButtonUI
                size="sm"
                variant="success"
                @click="() => (row.showSetMemberWageModal = true)"
                data-test="set-wage-button"
              >
                Set Wage
              </ButtonUI>
            </div>
          </template>
        </TableComponent>
      </div>
    </template>
  </CardComponent>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import { PlusCircleIcon, TrashIcon } from '@heroicons/vue/24/outline'
import AddMemberForm from '@/components/sections/SingleTeamView/forms/AddMemberForm.vue'
import ModalComponent from '@/components/ModalComponent.vue'
import { useUserDataStore } from '@/stores/user'
import ButtonUI from '@/components/ButtonUI.vue'
import CardComponent from '@/components/CardComponent.vue'
import TableComponent from '@/components/TableComponent.vue'
import UserComponent from '@/components/UserComponent.vue'

const userDataStore = useUserDataStore()
const showAddMemberForm = ref(false)

const route = useRoute()

const props = defineProps(['team', 'teamIsFetching'])
// const emits = defineEmits(['getTeam'])
const teamId = String(route.params.id)

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
