<template>
  <UCard :ui="{ body: 'p-0' }">
    <template #header>
      <div class="flex items-center justify-between">
        <p class="font-semibold text-lg">Team Members List</p>

        <UModal
          v-if="teamStore.currentTeamMeta.data?.ownerAddress == userDataStore.address"
          v-model:open="showAddMemberForm.show"
          title="Add a new Member"
          :ui="{ content: 'rounded-2xl' }"
          @update:open="(v) => !v && (showAddMemberForm = { mount: false, show: false })"
        >
          <UButton
            icon="i-heroicons-plus-circle"
            color="success"
            data-test="add-member-button"
            label="Add a new Member"
            @click="showAddMemberForm = { mount: true, show: true }"
          />

          <template #body>
            <AddMemberForm
              v-if="teamStore.currentTeamId && showAddMemberForm.mount"
              :teamId="teamStore.currentTeamId"
              @memberAdded="showAddMemberForm = { mount: false, show: false }"
            />
          </template>
        </UModal>
      </div>
    </template>

    <UTable
      :data="
        teamStore.currentTeamMeta.data?.members.map((member: any, index: number) => ({
          index: index + 1,
          ...member
        }))
      "
      :loading="isTeamWageDataFetching"
      :columns="columns"
      data-test="members-table"
    >
      <template #wage-header>
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

      <template #member-cell="{ row }">
        <UserComponent
          :user="{ name: row.original.name, address: row.original.address, imageUrl: row.original.imageUrl }"
        />
      </template>

      <template #maxWeeklyHours-cell="{ row }">
        <div v-if="!isTeamWageDataFetching" class="flex flex-col font-semibold">
          <span>{{ getMemberWageView(row.original.address).maximumHoursPerWeek }}</span>
          <span
            v-if="getMemberWageView(row.original.address).hasOvertime"
            class="text-xs text-black font-light"
          >
            OT: {{ getMemberWageView(row.original.address).maximumOvertimeHoursPerWeek }}
          </span>
        </div>
        <USkeleton v-if="isTeamWageDataFetching" class="h-4 w-24" />
      </template>

      <template #wage-cell="{ row }">
        <div v-if="!isTeamWageDataFetching" class="flex flex-col gap-1">
          <div class="flex flex-row gap-2 justify-between font-semibold">
            <span class="w-1/3 text-right pr-4">{{
              getMemberWageView(row.original.address).cashRatePerHour
            }}</span>
            <span class="w-1/3 text-right pr-4">{{
              getMemberWageView(row.original.address).usdcRatePerHour
            }}</span>
            <span class="w-1/3 text-right pr-4">{{
              getMemberWageView(row.original.address).tokenRatePerHour
            }}</span>
          </div>
          <div
            v-if="getMemberWageView(row.original.address).hasOvertime"
            class="flex flex-row gap-2 justify-between text-xs text-black font-light"
          >
            <span class="w-1/3 text-right pr-4">
              OT: {{ getMemberWageView(row.original.address).overtimeCashRatePerHour }}
            </span>
            <span class="w-1/3 text-right pr-4">
              OT: {{ getMemberWageView(row.original.address).overtimeUsdcRatePerHour }}
            </span>
            <span class="w-1/3 text-right pr-4">
              OT: {{ getMemberWageView(row.original.address).overtimeTokenRatePerHour }}
            </span>
          </div>
        </div>
        <USkeleton v-if="isTeamWageDataFetching" class="h-4 w-24" />
      </template>

      <template #action-cell="{ row }">
        <div v-if="teamId" class="flex flex-wrap gap-2">
          <DeleteMemberModal
            :member="{ name: row.original.name, address: row.original.address }"
            :teamId="teamId"
          />
          <UTooltip
            :text="!teamWageByAddress.get(row.original.address) ? 'No wage set for this member' : ''"
            :disabled="!!teamWageByAddress.get(row.original.address)"
            :delay-duration="0"
          >
            <UButton
              :color="teamWageByAddress.get(row.original.address)?.disabled ? 'success' : 'warning'"
              :loading="isToggling"
              :disabled="!teamWageByAddress.get(row.original.address) || isToggling"
              :icon="
                teamWageByAddress.get(row.original.address)?.disabled
                  ? 'i-heroicons-play'
                  : 'i-heroicons-pause'
              "
              :data-test="
                teamWageByAddress.get(row.original.address)?.disabled
                  ? 'resume-wage-button'
                  : 'pause-wage-button'
              "
              @click="toggleWageStatus(teamWageByAddress.get(row.original.address)!)"
            />
          </UTooltip>
          <SetMemberWageModal
            :member="{ name: row.original.name, address: row.original.address }"
            :teamId="teamId"
            :wage="teamWageByAddress.get(row.original.address)"
          />
        </div>
      </template>
    </UTable>
  </UCard>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import AddMemberForm from '@/components/sections/DashboardView/forms/AddMemberForm.vue'
import { useUserDataStore } from '@/stores/user'
import { useTeamStore, useToastStore } from '@/stores'
import UserComponent from '@/components/UserComponent.vue'
import { useGetTeamWagesQuery, useToggleWageStatusMutation } from '@/queries/wage.queries'
import type { Address } from 'viem'
import { NETWORK } from '@/constant'
import DeleteMemberModal from '@/components/sections/DashboardView/DeleteMemberModal.vue'
import type { Wage } from '@/types'
import SetMemberWageModal from './SetMemberWageModal.vue'

type MemberRow = {
  index: number
  name: string
  address: string
  imageUrl?: string
}

const userDataStore = useUserDataStore()
const toastStore = useToastStore()
const teamStore = useTeamStore()
const showAddMemberForm = ref({ mount: false, show: false })

const teamId = computed(() => teamStore.currentTeamId)

const {
  data: teamWageData,
  isLoading: isTeamWageDataFetching,
  error: teamWageDataError
} = useGetTeamWagesQuery({ queryParams: { teamId } })

watch(
  () => teamWageDataError.value,
  (error) => {
    if (error) toastStore.addErrorToast('Failed to fetch team wage data')
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
  const map = new Map<string, MemberWageView>()
  for (const wage of teamWageData.value ?? []) {
    map.set(wage.userAddress, buildMemberWageView(wage as Wage))
  }
  return map
})

const teamWageByAddress = computed(() => {
  const map = new Map<string, Wage>()
  for (const wage of teamWageData.value ?? []) {
    map.set(wage.userAddress, wage as Wage)
  }
  return map
})

const { mutate: executeToggleStatus, isPending: isToggling } = useToggleWageStatusMutation()

const toggleWageStatus = (wage: Wage) => {
  const action = wage.disabled ? 'enable' : 'disable'
  executeToggleStatus(
    { pathParams: { wageId: wage.id }, queryParams: { action } },
    {
      onSuccess: () => toastStore.addSuccessToast(`Member wage ${action}d successfully`),
      onError: () => toastStore.addErrorToast(`Failed to ${action} member wage`)
    }
  )
}

const getMemberWageView = (memberAddress: Address): MemberWageView => {
  return memberWageViewByAddress.value.get(memberAddress) ?? EMPTY_MEMBER_WAGE_VIEW
}

const columns = computed((): TableColumn<MemberRow>[] => {
  const cols: TableColumn<MemberRow>[] = [
    { accessorKey: 'index', header: '#' },
    { id: 'member', header: 'Member' },
    { id: 'maxWeeklyHours', header: 'Max Weekly Hours' },
    { id: 'wage', header: 'Hourly Rate' }
  ]
  if (teamStore.currentTeamMeta.data?.ownerAddress == userDataStore.address) {
    cols.push({ id: 'action', header: 'Action' })
  }
  return cols
})
</script>
