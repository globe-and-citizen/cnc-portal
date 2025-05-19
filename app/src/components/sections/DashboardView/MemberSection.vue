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
          <template #maxWeeklyHours-data="{ row }">
            {{ !isTeamWageDataFetching ? getMemberWage(row.address).maximumHoursPerWeek : '' }}
            <div class="skeleton w-24 h-4" v-if="isTeamWageDataFetching"></div>
          </template>
          <template #wage-data="{ row }">
            {{ !isTeamWageDataFetching ? getMemberWage(row.address).cashRatePerHour : '' }}
            <div class="skeleton w-24 h-4" v-if="isTeamWageDataFetching"></div
          ></template>
          <template #usdcHourlyRate-data="{ row }">
            {{ !isTeamWageDataFetching ? getMemberWage(row.address).usdcRatePerHour : '' }}
            <div class="skeleton w-24 h-4" v-if="isTeamWageDataFetching"></div>
          </template>
          <template #sherHourlyRate-data="{ row }">
            {{ !isTeamWageDataFetching ? getMemberWage(row.address).sherRatePerHour : '' }}
            <div class="skeleton w-24 h-4" v-if="isTeamWageDataFetching"></div>
          </template>
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
import type { WageResponse } from '@/types'

const userDataStore = useUserDataStore()
const toastStore = useToastStore()
const teamStore = useTeamStore()
const showAddMemberForm = ref(false)

// Create a computed property for team ID
const teamId = computed(() => teamStore.currentTeam?.id)
const teamIsLoading = computed(() => teamStore.currentTeamMeta?.teamIsFetching)
const {
  data: teamWageData,
  isFetching: isTeamWageDataFetching,
  error: teamWageDataError,
  execute: fetchTeamWageData
} = useCustomFetch(
  computed(() => `/wage/?teamId=${teamId.value}`),
  { immediate: false }
).json<Array<WageResponse>>()

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

// Watch for changes in the team wage data
watch(
  () => teamWageData.value,
  (data) => {
    if (data) {
      console.log('Team wage data:', data)
    }
  }
)

// const _getMemberWage = (memberAddress: Address) => {
//   if (!teamWageData.value) return 'N/A'
//   const memberWage = teamWageData.value.find((wage) => wage.userAddress === memberAddress)
//   return memberWage
//     ? `${memberWage.maximumHoursPerWeek} h/week & ${memberWage.cashRatePerHour} ${NETWORK.currencySymbol}/h`
//     : 'N/A'
// }

const getMemberWage = (memberAddress: Address) => {
  let memberWage
  if (teamWageData.value)
    // return 'N/A'
    memberWage = teamWageData.value.find((wage) => wage.userAddress === memberAddress)
  return {
    maximumHoursPerWeek: memberWage ? memberWage.maximumHoursPerWeek : 'N/A',
    cashRatePerHour: memberWage ? memberWage.cashRatePerHour : 'N/A',
    usdcRatePerHour: memberWage ? memberWage.usdcRatePerHour : 'N/A',
    sherRatePerHour: memberWage ? memberWage.sherRatePerHour : 'N/A'
  }
}

const columns = computed(() => {
  const columns = [
    { key: 'index', label: '#' },
    { key: 'member', label: 'Member' },
    { key: 'maxWeeklyHours', label: 'Max Weekly Hours' },
    { key: 'wage', label: `Hourly Rate (${NETWORK.currencySymbol})` },
    { key: 'usdcHourlyRate', label: 'Hourly Rate (USDC)' },
    { key: 'sherHourlyRate', label: 'Hourly Rate (SHER)' }
  ]
  if (teamStore.currentTeam?.ownerAddress == userDataStore.address) {
    columns.push({ key: 'action', label: 'Action' })
  }
  return columns
})
</script>
