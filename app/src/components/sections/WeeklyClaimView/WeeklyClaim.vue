<template>
  <CardComponent title="Weekly Claim" class="w-full pb-7">
    <TableComponent v-if="data" :rows="data" :columns="columns" :loading="isTeamClaimDataFetching">
      <template #member-data="{ row }">
        <UserComponent :user="row.member" />
      </template>

      <template #weekStart-data="{ row }">
        <span>{{ formatDate(row.weekStart) }}</span>
      </template>

      <template #hoursWorked-data="{ row }">
        <span class="font-bold"> {{ getTotalHoursWorked(row.claims) }}:00 hrs </span>
        <br />
        <span>of {{ row.wage.maximumHoursPerWeek ?? '-' }} hrs weekly limit</span>
      </template>

      <template #hourlyRate-data="{ row }">
        <div>
          <span class="font-bold">
            {{ row.wage.cashRatePerHour }} {{ NETWORK.currencySymbol }}
          </span>
          <br />
          <span class="font-bold"> {{ row.wage.tokenRatePerHour }} TOKEN </span>
          <br />
          <span class="font-bold"> {{ row.wage.usdcRatePerHour }} USDC </span>
          <br />
        </div>
      </template>

      <template #totalAmount-data="{ row }">
        <span class="font-bold">
          {{ getTotalHoursWorked(row.claims) * row.wage.cashRatePerHour }}
          {{ NETWORK.currencySymbol }}
        </span>
        <br />
        <span class="font-bold">
          {{ getTotalHoursWorked(row.claims) * row.wage.tokenRatePerHour }}
          TOKEN
        </span>
        <br />
        <span class="font-bold">
          {{ getTotalHoursWorked(row.claims) * row.wage.usdcRatePerHour }}
          USDC
        </span>
        <br />
        <span class="text-gray-500">
          {{
            (
              getTotalHoursWorked(row.claims) *
              Number(getHoulyRateInUserCurrency(row.wage.cashRatePerHour))
            ).toFixed(2)
          }}
          {{ NETWORK.nativeTokenSymbol }} / USD
        </span>
      </template>

      <template #action-data="{}">
        <ButtonUI class="btn btn-success btn-sm" type="button"> Approve </ButtonUI>
      </template>
    </TableComponent>
  </CardComponent>
</template>

<script setup lang="ts">
import CardComponent from '@/components/CardComponent.vue'
import TableComponent, { type TableColumn } from '@/components/TableComponent.vue'
import UserComponent from '@/components/UserComponent.vue'
import { NETWORK } from '@/constant'
import { useCustomFetch } from '@/composables/useCustomFetch'
import { computed } from 'vue'
import { useCurrencyStore } from '@/stores'
import ButtonUI from '@/components/ButtonUI.vue'
import { useUserDataStore, useTeamStore } from '@/stores'

function getTotalHoursWorked(claims: { hoursWorked: number }[]) {
  return claims.reduce((sum, claim) => sum + claim.hoursWorked, 0)
}

const userStore = useUserDataStore()
const teamStore = useTeamStore()
const weeklyClaimUrl = computed(
  () =>
    `/weeklyClaim/?teamId=${teamStore.currentTeam?.id}${
      userStore.address !== teamStore.currentTeam?.ownerAddress
        ? `&memberAddress=${userStore.address}`
        : ''
    }`
)

const { data, error } = useCustomFetch(weeklyClaimUrl.value).get().json()

const isTeamClaimDataFetching = computed(() => !data.value && !error.value)

const currencyStore = useCurrencyStore()
const getHoulyRateInUserCurrency = (rate: number) => {
  return (
    currencyStore.nativeToken.priceInLocal ? rate * currencyStore.nativeToken.priceInLocal : 0
  ).toFixed(2)
}
function formatDate(date: string | Date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const locale = navigator.language || 'en-US'
  return d.toLocaleDateString(locale, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

const columns = [
  {
    key: 'weekStart',
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
    key: 'hourlyRate',
    label: 'Hourly Rate',
    sortable: false,
    class: 'text-black text-base'
  },
  {
    key: 'totalAmount',
    label: 'Total Amount',
    sortable: false,
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
