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
          <span class="font-bold">
            {{ row.claims.reduce((sum: number, claim) => sum + claim.hoursWorked, 0) }}:00 hrs
          </span>
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
            {{
              row.claims.reduce((sum, claim) => sum + claim.hoursWorked, 0) *
              row.wage.cashRatePerHour
            }}
            {{ NETWORK.currencySymbol }}
          </span>
          <br />
          <span class="font-bold">
            {{
              row.claims.reduce((sum, claim) => sum + claim.hoursWorked, 0) *
              row.wage.tokenRatePerHour
            }}
            TOKEN
          </span>
          <br />
          <span class="font-bold">
            {{
              row.claims.reduce((sum, claim) => sum + claim.hoursWorked, 0) *
              row.wage.usdcRatePerHour
            }}
            USDC
          </span>
          <br />
          <span class="text-gray-500">
            {{ getHoulyRateInUserCurrency(row.wage.cashRatePerHour) }}
            {{ NETWORK.nativeTokenSymbol }} / USD
          </span>
        </template>

        <template #action-data="{ row }">
          <ButtonUI class="btn btn-success btn-sm" type="button" @click="onApprove(row)">
            Approve
          </ButtonUI>
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

// Récupère la liste des users de l'équipe
// const { data: teamUsersData } = useCustomFetch('/user/?teamId=1').get().json()

// function getUserByAddress(address: string) {
//   return teamUsersData.value?.find((u: any) => u.address === address)
// }

const { data, error } = useCustomFetch('/weeklyClaim/?teamId=1').get().json()

const isTeamClaimDataFetching = computed(() => !data.value && !error.value)

const currencyStore = useCurrencyStore()
const getHoulyRateInUserCurrency = (rate: number) => {
  return (currencyStore.nativeTokenPrice ? rate * currencyStore.nativeTokenPrice : 0).toFixed(2)
}

function formatDate(date: string | Date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d.toLocaleDateString('fr-FR', {
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
