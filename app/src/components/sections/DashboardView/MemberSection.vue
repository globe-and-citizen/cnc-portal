<template>
  <CardComponent title="Team Members List">
    <template
      #card-action
      v-if="teamStore.currentTeamMeta.data?.ownerAddress == userDataStore.address"
    >
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
          v-if="teamStore.currentTeamId && showAddMemberForm.mount"
          :teamId="teamStore.currentTeamId"
          @memberAdded="showAddMemberForm = { mount: false, show: false }"
        />
      </ModalComponent>
    </template>
    <template #default>
      <div class="divider m-0"></div>
      <div class="overflow-x-auto">
        <TableComponent
          :rows="
            teamStore.currentTeamMeta.data?.members.map((member: any, index: number) => {
              return { index: index + 1, ...member }
            })
          "
          :loading="isTeamWageDataFetching"
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
            v-if="teamId && teamStore.currentTeamMeta.data?.ownerAddress === userDataStore.address"
          >
            <div class="flex flex-wrap gap-2">
              <DeleteMemberModal
                :member="{ name: row.name, address: row.address }"
                :teamId="teamId"
              />
              <SetMemberWageModal
                :member="{ name: row.name, address: row.address }"
                :teamId="teamId"
                :wage="teamWageData?.find((wage) => wage.userAddress === row.address)"
              />
            </div>
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
import { useTeamWagesQuery } from '@/queries/wage.queries'
import type { Address } from 'viem'
import { NETWORK } from '@/constant'
import DeleteMemberModal from '@/components/sections/DashboardView/DeleteMemberModal.vue'
import SetMemberWageModal from '@/components/sections/DashboardView/SetMemberWageModal.vue'

const userDataStore = useUserDataStore()
const toastStore = useToastStore()
const teamStore = useTeamStore()
const showAddMemberForm = ref({
  mount: false,
  show: false
})

// Use computed team ID from store
const teamId = computed(() => teamStore.currentTeamId)

// Fetch team wages using the new query
const {
  data: teamWageData,
  isLoading: isTeamWageDataFetching,
  error: teamWageDataError
} = useTeamWagesQuery(teamId)

// Handle wage data fetch errors
watch(
  () => teamWageDataError.value,
  (error) => {
    if (error) {
      toastStore.addErrorToast('Failed to fetch team wage data')
    }
  }
)

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
  if (teamStore.currentTeamMeta.data?.ownerAddress == userDataStore.address) {
    columns.push({ key: 'action', label: 'Action' })
  }
  return columns
})
</script>
