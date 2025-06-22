<template>
  <div class="overflow-x-auto flex flex-col gap-4 card bg-white p-6">
    <div class="w-full flex justify-between">
      <span class="font-bold text-lg">Claims Table</span>
      <div class="flex flex-row gap-4">
        <CRAddERC20Support />
        <SubmitClaims v-if="hasWage" @refetch-claims="async () => await fetchTeamClaimData()" />
      </div>
    </div>
    <div class="form-control flex flex-row gap-4">
      <label class="label cursor-pointer flex gap-2" :key="status" v-for="status in statusses">
        <span class="label-text">{{
          status == 'signed' ? 'Approved' : status.charAt(0).toUpperCase() + status.slice(1)
        }}</span>
        <input
          type="radio"
          :name="status"
          :data-test="`radio-${status}`"
          class="radio checked:bg-primary"
          :checked="selectedRadio === status"
          @change="() => (selectedRadio = status)"
        />
      </label>
    </div>
    <div class="bg-bae-100 w-full">
      <TableComponent
        :rows="teamClaimData ?? undefined"
        :columns="columns"
        :loading="isTeamClaimDataFetching"
      >
        <template #memo-data="{ row }">
          <span class="font-bold">{{ row.memo }}</span>
        </template>

        <template #createdAt-data="{ row }">
          <span>{{ new Date(row.createdAt).toLocaleString() }}</span>
        </template>
        <template #action-data="{ row }">
          <CRSigne
            :weeklyClaim="formatRow(row) as CRSignClaim"
            @claim-signed="fetchTeamClaimData()"
          />
          <CRWithdrawClaim
            :claim="formatRow(row) as CRSignClaim"
            @claim-withdrawn="fetchTeamClaimData()"
          />
          <!-- <ButtonUI
            v-if="row.status == 'pending' && ownerAddress == userDataStore.address"
            variant="success"
            data-test="approve-button"
            :loading="loadingApprove[row.id]"
            @click="async () => await approveClaim(row as ClaimResponse)"
            >Approve</ButtonUI> -->

          <!-- <ButtonUI
          v-if="row.status == 'approved' && ownerAddress == userDataStore.address"
          variant="error"
          data-test="disable-button"
          @click="() => {}"
          >Disable</ButtonUI
        > -->
          <!-- <ButtonUI
          v-if="row.status == 'disabled'"
          variant="info"
          data-test="enable-button"
          @click="() => {}"
          >Enable</ButtonUI
        > -->
        </template>
        <template #member-data="{ row }">
          <UserComponent v-if="!!row.wage.user" :user="row.wage.user"></UserComponent>
        </template>
        <template #hoursWorked-data="{ row }">
          <span class="font-bold">
            {{ row.hoursWorked }} / {{ row.wage.maximumHoursPerWeek }} h
          </span>
          <br />
          <span>{{ row.wage.maximumHoursPerWeek }} h/week</span>
        </template>
        <template #hourlyRate-data="{ row }">
          <span class="font-bold">
            {{ row.wage.cashRatePerHour }} {{ NETWORK.currencySymbol }} / h</span
          >
          <br />
          <span
            >{{ getHourlyRateInUserCurrency(row.wage.cashRatePerHour) }}
            {{ currencyStore.localCurrency.code }} / h
          </span>
        </template>
        <template #status-data="{ row }">
          <span
            class="badge"
            :class="{
              'badge-info': row.status === 'pending',
              'badge-outline': row.status === 'signed',
              'bg-error': row.status === 'disabled',
              'bg-neutral text-white': row.status === 'withdrawn'
            }"
            >{{
              row.status == 'pending'
                ? 'Submitted'
                : row.status == 'signed'
                  ? 'Approved'
                  : row.status.charAt(0).toUpperCase() + row.status.slice(1)
            }}</span
          >
        </template>
      </TableComponent>
    </div>
  </div>
</template>

<script setup lang="ts">
import TableComponent, { type TableColumn, type TableRow } from '@/components/TableComponent.vue'
import { useCustomFetch } from '@/composables/useCustomFetch'
import { useCurrencyStore, useTeamStore, useToastStore, useUserDataStore } from '@/stores'
import type { ClaimResponse, CRSignClaim, WageResponse } from '@/types'
import { computed, ref, watch } from 'vue'
import SubmitClaims from './SubmitClaims.vue'
import UserComponent from '@/components/UserComponent.vue'
import CRSigne from './CRSigne.vue'
import CRWithdrawClaim from './CRWithdrawClaim.vue'
import { NETWORK } from '@/constant'
import CRAddERC20Support from './CRAddERC20Support.vue'

const toastStore = useToastStore()
const teamStore = useTeamStore()
const currencyStore = useCurrencyStore()
const statusses = ['all', 'pending', 'signed', 'withdrawn']
const selectedRadio = ref('all')
const { address: currentAddress } = useUserDataStore()
const teamId = computed(() => teamStore.currentTeam?.id)
const teamIsLoading = computed(() => teamStore.currentTeamMeta?.teamIsFetching)
const statusUrl = computed(() =>
  selectedRadio.value === 'all' ? '' : `&status=${selectedRadio.value}`
)
const claimURL = computed(() => `/claim/?teamId=${teamId.value}${statusUrl.value}`)
const getHourlyRateInUserCurrency = (rate: number) => {
  const nativeTokenInfo = currencyStore.getTokenInfo('native')
  const price = nativeTokenInfo?.prices.find((p) => p.id == 'local')?.price || 0
  return (rate * price).toFixed(2)
}
const {
  data: teamClaimData,
  isFetching: isTeamClaimDataFetching,
  error: teamClaimDataError,
  execute: fetchTeamClaimData
} = useCustomFetch(claimURL, { immediate: false, refetch: true }).json<Array<ClaimResponse>>()

const { data: teamWageData, error: teamWageDataError } = useCustomFetch(
  computed(() => `/wage/?teamId=${teamId.value}`)
)
  .get()
  .json<Array<WageResponse>>()

const hasWage = computed(() => {
  const userWage = teamWageData.value?.find((wage) => wage.userAddress === currentAddress)
  if (!userWage) return false

  return true
})

const formatRow = (row: TableRow) => {
  return row as ClaimResponse
}

// Watch team ID update to fetch the team wage data
watch(
  [teamId, teamIsLoading],
  async ([newTeamId, newIsloading]) => {
    if (newTeamId && !newIsloading) await fetchTeamClaimData()

    if (teamClaimDataError.value) {
      toastStore.addErrorToast('Failed to fetch team wage data')
    }
  },
  { immediate: true }
)
watch(teamWageDataError, (newVal) => {
  if (newVal) {
    toastStore.addErrorToast('Failed to fetch user wage data')
  }
})

const columns = [
  {
    key: 'createdAt',
    label: 'Date',
    sortable: true,
    class: 'text-black text-base'
  },
  {
    key: 'member',
    label: 'Member',
    sortable: false,
    class: 'text-black text-base'
  },
  {
    key: 'hoursWorked',
    label: 'Hour Worked',
    sortable: false,
    class: 'text-black text-base'
  },
  {
    key: 'memo',
    label: 'Memo',
    sortable: false,
    class: 'text-black text-base'
  },
  {
    key: 'hourlyRate',
    label: 'Hourly Rate',
    sortable: false,
    class: 'text-black text-base'
  },
  {
    key: 'status',
    label: 'Status',
    class: 'text-black text-base'
  },
  {
    key: 'action',
    label: 'Action',
    sortable: false,
    class: 'text-black text-base'
  }
] as TableColumn[]
</script>
