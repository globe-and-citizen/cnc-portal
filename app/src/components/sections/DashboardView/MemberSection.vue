<template>
  <CardComponent title="Team Members List">
    <template #card-action v-if="teamStore.currentTeam?.ownerAddress == userDataStore.address">
      <ButtonUI
        @click="
          () => {
            showAddMemberForm = { mount: true, show: true }
          }
        "
        data-test="add-member-button"
        variant="primary"
        class="w-max"
      >
        <IconifyIcon icon="heroicons-outline:plus-circle" class="size-6" /> Add a new Member
      </ButtonUI>
      <ModalComponent
        v-model="showAddMemberForm.show"
        @reset="() => (showAddMemberForm = { mount: false, show: false })"
      >
        <AddMemberForm
          v-if="teamStore.currentTeam?.id && showAddMemberForm.mount"
          :teamId="teamStore.currentTeam?.id"
          @memberAdded="showAddMemberForm = { mount: false, show: false }"
          @close-modal="() => (showAddMemberForm = { mount: false, show: false })"
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
          <template #wage-header="">
            <div class="flex flex-col gap-0 w-full pt-7">
              <div class="text-center pb-1">
                <span>Hourly Rates</span>
              </div>
              <div class="flex flex-row justify-between border-t border-base-400">
                <span class="w-1/3 text-xs p-1 text-center bg-[#C8FACD]">{{
                  NETWORK.currencySymbol
                }}</span>
                <span class="w-1/3 text-xs p-1 text-center bg-[#FEF3DE]">USDC</span>
                <span class="w-1/3 text-xs p-1 text-center bg-[#D9F1F6]">SHER</span>
              </div>
            </div>
          </template>
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
            <div class="flex flex-row gap-2 justify-between">
              <span class="w-1/3 text-right pr-4">
                {{ !isTeamWageDataFetching ? getMemberWage(row.address).cashRatePerHour : '' }}
              </span>
              <span class="w-1/3 text-right pr-4">
                {{ !isTeamWageDataFetching ? getMemberWage(row.address).usdcRatePerHour : '' }}
              </span>
              <span class="w-1/3 text-right pr-4">
                {{ !isTeamWageDataFetching ? getMemberWage(row.address).tokenRatePerHour : '' }}
              </span>
            </div>
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
import type { Wage } from '@/types'

const userDataStore = useUserDataStore()
const toastStore = useToastStore()
const teamStore = useTeamStore()
const showAddMemberForm = ref({
  mount: false,
  show: false
})

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
).json<Array<Wage>>()

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

watch(teamWageData, (newData) => {
  if (newData) console.log('Team wage data fetched successfully:', newData)
})

const getMemberWage = (memberAddress: Address) => {
  let memberWage
  let cashRatePerHour
  let usdcRatePerHour
  let tokenRatePerHour

  if (teamWageData.value) {
    memberWage = teamWageData.value.find((wage) => wage.userAddress === memberAddress)
    if (memberWage) {
      cashRatePerHour = memberWage?.ratePerHour?.find((rate) => rate.type === 'native')?.amount
      usdcRatePerHour = memberWage?.ratePerHour?.find((rate) => rate.type === 'usdc')?.amount
      tokenRatePerHour = memberWage?.ratePerHour?.find((rate) => rate.type === 'sher')?.amount
    }
  }

  return {
    maximumHoursPerWeek: memberWage ? `${memberWage.maximumHoursPerWeek} hrs/wk` : 'N/A',
    cashRatePerHour: cashRatePerHour ? `${cashRatePerHour} ${NETWORK.currencySymbol}/hr` : 'N/A',
    usdcRatePerHour: usdcRatePerHour ? `${usdcRatePerHour} USDC/hr` : 'N/A',
    tokenRatePerHour: tokenRatePerHour ? `${tokenRatePerHour} SHER/hr` : 'N/A'
  }
}

const columns = computed(() => {
  const columns = [
    { key: 'index', label: '#' },
    { key: 'member', label: 'Member' },
    { key: 'maxWeeklyHours', label: 'Max Weekly Hours' },
    { key: 'wage', label: `Hourly Rate` }
  ]
  if (teamStore.currentTeam?.ownerAddress == userDataStore.address) {
    columns.push({ key: 'action', label: 'Action' })
  }
  return columns
})
</script>
