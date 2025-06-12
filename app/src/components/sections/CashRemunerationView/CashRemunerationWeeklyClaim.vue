<template>
  <CardComponent title="Weekly Claim: Pending" class="w-full pb-7">
    <div class="">
      <transition-group name="stack" tag="div" class="stack w-full">
        <div v-for="item in data" :key="item.weekStart" class="card shadow-md bg-white p-4">
          <TableComponent :rows="[item]" :columns="columns" :loading="isTeamClaimDataFetching">
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
        </div>
      </transition-group>
    </div>
  </CardComponent>
</template>

<script setup lang="ts">
import CardComponent from '@/components/CardComponent.vue'
import UserComponent from '@/components/UserComponent.vue'
import ButtonUI from '@/components/ButtonUI.vue'
import TableComponent from '@/components/TableComponent.vue'
import { NETWORK } from '@/constant'
import { useCustomFetch } from '@/composables/useCustomFetch'
import { computed } from 'vue'
import { useCurrencyStore, useTeamStore, useUserDataStore } from '@/stores'

function getTotalHoursWorked(claims: { hoursWorked: number }[]) {
  return claims.reduce((sum, claim) => sum + claim.hoursWorked, 0)
}

const userStore = useUserDataStore()
const teamStore = useTeamStore()

const weeklyClaimUrl = computed(() => {
  return `/weeklyClaim/?teamId=${teamStore.currentTeam?.id}${
    userStore.address !== teamStore.currentTeam?.ownerAddress
      ? `&memberAddress=${userStore.address}`
      : ''
  }`
})

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

<style scoped>
.stack {
  display: inline-grid;
  place-items: center;
  align-items: flex-end;
}
.stack > * {
  grid-column-start: 1;
  grid-row-start: 1;
  transform: translateY(15%) scale(0.95);
  z-index: 1;
  width: 100%;
  opacity: 0.6;
}
.stack > *:nth-child(2) {
  transform: translateY(7.5%) scale(0.97);
  z-index: 2;
  opacity: 0.8;
}
.stack > *:nth-child(1) {
  transform: translateY(0) scale(1);
  z-index: 3;
  opacity: 1;
}

/* Responsive */
@media (max-width: 768px) {
  .table {
    font-size: 0.75rem;
  }
  .table td {
    padding: 0.5rem;
  }
}
</style>
