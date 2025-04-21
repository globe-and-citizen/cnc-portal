<template>
  <CardComponent title="Team Members List">
    <template #card-action v-if="teamStore.currentTeam?.ownerAddress == userDataStore.address">
      <ButtonUI
        @click="
          () => {
            showAddMemberForm = !showAddMemberForm
          }
        "
        data-test="add-member-button"
        variant="primary"
        class="w-max"
      >
        <IconifyIcon icon="heroicons-outline:plus-circle" class="size-6" /> Add a new Member
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
              :user="{ name: row.name, address: row.address, imageUrl: row.imageUrl }"
            />
          </template>
          <template #wage-data="{ row }">
            {{ !isTeamWageDataFetching ? getMemberWage(row.address) : '' }}
            <div class="skeleton w-24 h-4" v-if="isTeamWageDataFetching"></div
          ></template>
          <template
            #action-data="{ row }"
            v-if="teamStore.currentTeam?.ownerAddress === userDataStore.address"
          >
            <MemberAction
              :member="{ name: row.name, address: row.address }"
              :team-id="teamStore.currentTeam?.id"
              @refetch-wage="fetchTeamWageData"
            ></MemberAction>
          </template>
        </TableComponent>
      </div>
    </template>
  </CardComponent>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Icon as IconifyIcon } from '@iconify/vue'
import AddMemberForm from '@/components/sections/DashboardView/forms/AddMemberForm.vue'
import ModalComponent from '@/components/ModalComponent.vue'
import { useUserDataStore } from '@/stores/user'
import { useTeamStore, useToastStore } from '@/stores'
import ButtonUI from '@/components/ButtonUI.vue'
import CardComponent from '@/components/CardComponent.vue'
import TableComponent from '@/components/TableComponent.vue'
import UserComponent from '@/components/UserComponent.vue'
import MemberAction from './MemberAction.vue'
import { useCustomFetch } from '@/composables'
import type { Address } from 'viem'
import { NETWORK } from '@/constant'

const userDataStore = useUserDataStore()
const toastStore = useToastStore()
const teamStore = useTeamStore()
const showAddMemberForm = ref(false)

// Create a computed property for team ID
const teamId = computed(() => teamStore.currentTeam?.id)
const teamIsLoading = computed(() => teamStore.currentTeamMeta?.teamIsFetching)
interface WageData {
  userAddress: Address
  maximumHoursPerWeek: number
  cashRatePerHour: number
}
const {
  data: teamWageData,
  isFetching: isTeamWageDataFetching,
  error: teamWageDataError,
  execute: fetchTeamWageData
} = useCustomFetch(
  computed(() => `/wage/?teamId=${teamId.value}`),
  { immediate: false }
).json<Array<WageData>>()

// Watch team ID update to fetch the team wage data
watch(
  [teamId, teamIsLoading],
  ([newTeamId, newIsloading]) => {
    if (newTeamId && !newIsloading) fetchTeamWageData()
  },
  { immediate: true }
)

// Watch for errors in fetching team wage data
watch(
  () => teamWageDataError.value,
  (error) => {
    if (error) {
      toastStore.addErrorToast('Failed to fetch team wage data')
    }
  }
)

const getMemberWage = (memberAddress: Address) => {
  if (!teamWageData.value) return 'N/A'
  const memberWage = teamWageData.value.find((wage) => wage.userAddress === memberAddress)
  return memberWage
    ? `${memberWage.maximumHoursPerWeek} h/week & ${memberWage.cashRatePerHour} ${NETWORK.currencySymbol}/h`
    : 'N/A'
}

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
