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
            <div v-if="!isTeamWageDataFetching" class="flex flex-col font-semibold">
              <span>{{ getMemberWageView(row.address).maximumHoursPerWeek }}</span>
              <span
                v-if="getMemberWageView(row.address).hasOvertime"
                class="text-xs text-black font-light"
              >
                OT: {{ getMemberWageView(row.address).maximumOvertimeHoursPerWeek }}
              </span>
            </div>
            <div class="skeleton w-24 h-4" v-if="isTeamWageDataFetching"></div>
          </template>
          <template #wage-data="{ row }">
            <div class="flex flex-col gap-1">
              <div class="flex flex-row gap-2 justify-between font-semibold">
                <span class="w-1/3 text-right pr-4">
                  {{
                    !isTeamWageDataFetching ? getMemberWageView(row.address).cashRatePerHour : ''
                  }}
                </span>
                <span class="w-1/3 text-right pr-4">
                  {{
                    !isTeamWageDataFetching ? getMemberWageView(row.address).usdcRatePerHour : ''
                  }}
                </span>
                <span class="w-1/3 text-right pr-4">
                  {{
                    !isTeamWageDataFetching ? getMemberWageView(row.address).tokenRatePerHour : ''
                  }}
                </span>
              </div>
              <div
                v-if="!isTeamWageDataFetching && getMemberWageView(row.address).hasOvertime"
                class="flex flex-row gap-2 justify-between text-xs text-black font-light"
              >
                <span class="w-1/3 text-right pr-4">
                  OT: {{ getMemberWageView(row.address).overtimeCashRatePerHour }}
                </span>
                <span class="w-1/3 text-right pr-4">
                  OT: {{ getMemberWageView(row.address).overtimeUsdcRatePerHour }}
                </span>
                <span class="w-1/3 text-right pr-4">
                  OT: {{ getMemberWageView(row.address).overtimeTokenRatePerHour }}
                </span>
              </div>
            </div>
            <div class="skeleton w-24 h-4" v-if="isTeamWageDataFetching"></div>
          </template>
          <template
            #action-data="{ row }"
            v-if="teamId && teamStore.currentTeamMeta.data?.ownerAddress === userDataStore.address"
          >
            <div class="flex flex-wrap gap-2">
              <DeleteMemberModal
                :member="{ name: row.name, address: row.address }"
                :teamId="teamId"
              />
              <SetMemberWageModalCopy
                :member="{ name: row.name, address: row.address }"
                :teamId="teamId"
                :wage="teamWageByAddress.get(row.address)"
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
import { useGetTeamWagesQuery } from '@/queries/wage.queries'
import type { Address } from 'viem'
import { NETWORK } from '@/constant'
import DeleteMemberModal from '@/components/sections/DashboardView/DeleteMemberModal.vue'
import type { Wage } from '@/types'
import SetMemberWageModalCopy from './SetMemberWageModalCopy.vue'

const userDataStore = useUserDataStore()
const toastStore = useToastStore()
const teamStore = useTeamStore()
const showAddMemberForm = ref({
  mount: false,
  show: false
})

const teamId = computed(() => teamStore.currentTeamId)

const {
  data: teamWageData,
  isLoading: isTeamWageDataFetching,
  error: teamWageDataError
} = useGetTeamWagesQuery({ queryParams: { teamId } })

watch(
  () => teamWageDataError.value,
  (error) => {
    if (error) {
      toastStore.addErrorToast('Failed to fetch team wage data')
    }
  }
)

type MemberWageView = {
  maximumHoursPerWeek: string
  maximumOvertimeHoursPerWeek: string
  hasOvertime: boolean
  cashRatePerHour: string
  usdcRatePerHour: string
  tokenRatePerHour: string
  overtimeCashRatePerHour: string
  overtimeUsdcRatePerHour: string
  overtimeTokenRatePerHour: string
}

const EMPTY_MEMBER_WAGE_VIEW: MemberWageView = {
  maximumHoursPerWeek: 'N/A',
  maximumOvertimeHoursPerWeek: 'N/A',
  hasOvertime: false,
  cashRatePerHour: 'N/A',
  usdcRatePerHour: 'N/A',
  tokenRatePerHour: 'N/A',
  overtimeCashRatePerHour: 'N/A',
  overtimeUsdcRatePerHour: 'N/A',
  overtimeTokenRatePerHour: 'N/A'
}

const buildMemberWageView = (memberWage: Wage): MemberWageView => {
  const cashRatePerHour = memberWage.ratePerHour?.find((rate) => rate.type === 'native')?.amount
  const usdcRatePerHour = memberWage.ratePerHour?.find((rate) => rate.type === 'usdc')?.amount
  const tokenRatePerHour = memberWage.ratePerHour?.find((rate) => rate.type === 'sher')?.amount

  const overtimeCashRatePerHour = memberWage.overtimeRatePerHour?.find(
    (rate) => rate.type === 'native'
  )?.amount
  const overtimeUsdcRatePerHour = memberWage.overtimeRatePerHour?.find(
    (rate) => rate.type === 'usdc'
  )?.amount
  const overtimeTokenRatePerHour = memberWage.overtimeRatePerHour?.find(
    (rate) => rate.type === 'sher'
  )?.amount

  const hasOvertime = Boolean(memberWage.overtimeRatePerHour?.length)
  const maximumOvertimeHoursPerWeek = memberWage.maximumOvertimeHoursPerWeek

  return {
    maximumHoursPerWeek: `${memberWage.maximumHoursPerWeek} hrs/wk`,
    maximumOvertimeHoursPerWeek:
      hasOvertime && maximumOvertimeHoursPerWeek != null
        ? `${maximumOvertimeHoursPerWeek} hrs/wk`
        : hasOvertime
          ? 'N/A (legacy)'
          : 'N/A',
    hasOvertime,
    cashRatePerHour:
      cashRatePerHour != null ? `${cashRatePerHour} ${NETWORK.currencySymbol}/hr` : 'N/A',
    usdcRatePerHour: usdcRatePerHour != null ? `${usdcRatePerHour} USDC/hr` : 'N/A',
    tokenRatePerHour: tokenRatePerHour != null ? `${tokenRatePerHour} SHER/hr` : 'N/A',
    overtimeCashRatePerHour:
      overtimeCashRatePerHour != null
        ? `${overtimeCashRatePerHour} ${NETWORK.currencySymbol}/hr`
        : 'N/A',
    overtimeUsdcRatePerHour:
      overtimeUsdcRatePerHour != null ? `${overtimeUsdcRatePerHour} USDC/hr` : 'N/A',
    overtimeTokenRatePerHour:
      overtimeTokenRatePerHour != null ? `${overtimeTokenRatePerHour} SHER/hr` : 'N/A'
  }
}

const memberWageViewByAddress = computed(() => {
  const wageViewByAddress = new Map<string, MemberWageView>()

  for (const wage of teamWageData.value ?? []) {
    wageViewByAddress.set(wage.userAddress, buildMemberWageView(wage as Wage))
  }

  return wageViewByAddress
})

const teamWageByAddress = computed(() => {
  const wages = new Map<string, Wage>()

  for (const wage of teamWageData.value ?? []) {
    wages.set(wage.userAddress, wage as Wage)
  }

  return wages
})

const getMemberWageView = (memberAddress: Address): MemberWageView => {
  return memberWageViewByAddress.value.get(memberAddress) ?? EMPTY_MEMBER_WAGE_VIEW
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
