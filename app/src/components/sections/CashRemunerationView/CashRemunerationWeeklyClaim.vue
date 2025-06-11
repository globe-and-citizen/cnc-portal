<template>
  <CardComponent title="Weekly Claim" class="w-full pb-7">
    <WeeklyClaimComponent>
      <TableComponent
        v-if="data"
        :rows="data"
        :columns="columns"
        :loading="isTeamClaimDataFetching"
      >
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
              {{ getHourlyRate(row.wage.ratePerHour, 'native') }} {{ NETWORK.currencySymbol }}
            </span>
            <br />
            <span class="font-bold"> {{ getHourlyRate(row.wage.ratePerHour, 'sher') }} TOKEN </span>
            <br />
            <span class="font-bold"> {{ getHourlyRate(row.wage.ratePerHour, 'usdc') }} USDC </span>
            <br />
          </div>
        </template>

        <template #totalAmount-data="{ row }">
          <span class="font-bold">
            {{
              getHourlyRate(row.wage.ratePerHour, 'native') === 'N/A'
                ? 'N/A'
                : Number(getHourlyRate(row.wage.ratePerHour, 'native')) *
                  getTotalHoursWorked(row.claims)
            }}
            {{ NETWORK.currencySymbol }}
          </span>
          <br />
          <span class="font-bold">
            {{
              getHourlyRate(row.wage.ratePerHour, 'sher') === 'N/A'
                ? 'N/A'
                : Number(getHourlyRate(row.wage.ratePerHour, 'sher')) *
                  getTotalHoursWorked(row.claims)
            }}
            TOKEN
          </span>
          <br />
          <span class="font-bold">
            {{
              getHourlyRate(row.wage.ratePerHour, 'usdc') === 'N/A'
                ? 'N/A'
                : Number(getHourlyRate(row.wage.ratePerHour, 'usdc')) *
                  getTotalHoursWorked(row.claims)
            }}
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

        <template #action-data="{ row }">
          <!-- <ButtonUI class="btn btn-success btn-sm" type="button"> Approve </ButtonUI> -->
          <CRSigne
            v-if="row.claims.length > 0 && row.wage.ratePerHour"
            :claim="{
              id: row.id, //which id do we use, individual or weekly claim?
              status: 'pending',
              hoursWorked: getTotalHoursWorked(row.claims),
              createdAt: row.createdAt as string, //which date do we use, latest claim or weekly claim?
              wage: {
                ratePerHour: row.wage.ratePerHour as RatePerHour,
                userAddress: row.wage.userAddress as Address
              }
            }"
          />
        </template>
      </TableComponent>
    </WeeklyClaimComponent>
  </CardComponent>
</template>

<script setup lang="ts">
import CardComponent from '@/components/CardComponent.vue'
import WeeklyClaimComponent from '@/components/WeeklyClaimComponent.vue'
import TableComponent, { type TableColumn } from '@/components/TableComponent.vue'
import UserComponent from '@/components/UserComponent.vue'
import { NETWORK } from '@/constant'
import { useCustomFetch } from '@/composables/useCustomFetch'
import { computed } from 'vue'
import { useCurrencyStore } from '@/stores'
import ButtonUI from '@/components/ButtonUI.vue'
import { useUserDataStore, useTeamStore } from '@/stores'
import type { RatePerHour, SupportedTokens } from '@/types'
import CRSigne from './CRSigne.vue'
import type { Address } from 'viem'

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
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

const getDate = (claims: { id: number; createdAt: string }[]) => {
  let latestDate
  let latestId = 0
  for (const claim of claims) {
    if (claim.id > latestId) {
      latestId = claim.id
      latestDate = claim.createdAt
    }
  }
  return latestDate
}

const getHourlyRate = (ratePerHour: RatePerHour, type: SupportedTokens) => {
  switch (type) {
    case 'native':
      return ratePerHour.find((rate) => rate.type === 'native')
        ? ratePerHour.find((rate) => rate.type === 'native')!.amount
        : 'N/A'
    case 'sher':
      return ratePerHour.find((rate) => rate.type === 'sher')
        ? ratePerHour.find((rate) => rate.type === 'sher')!.amount
        : 'N/A'
    case 'usdc':
      return ratePerHour.find((rate) => rate.type === 'usdc')
        ? ratePerHour.find((rate) => rate.type === 'usdc')!.amount
        : 'N/A'
    default:
      return 'N/A'
  }
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
