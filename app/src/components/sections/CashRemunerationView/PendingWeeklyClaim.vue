<template>
  <div>
    <CRWeeklyClaimOwnerHeader />
    <transition-group name="stack" tag="div" class="stack w-full">
      <div
        v-for="(item, index) in data?.filter(
          (weeklyClaim) => weeklyClaim.weekStart < new Date().toISOString()
        )"
        :key="item.weekStart"
        class="card shadow-lg bg-white p-4"
        :class="{
          'transition -translate-y-full opacity-0  duration-1000': index === 0
        }"
      >
        <TableComponent :rows="[item]" :columns="columns" :isFetching="isFetching">
          <template #member-data="{ row }">
            <UserComponent :user="row.member" />
          </template>
          <template #weekStart-data="{ row }">
            <span class="font-bold line-clamp-1">{{ getCurrentMonthYear(row.weekStart) }}</span>

            <span>{{ formatDate(row.weekStart) }}</span>
          </template>

          <template #hoursWorked-data="{ row }">
            <span class="font-bold"> {{ getTotalHoursWorked(row.claims) }}:00 hrs </span>
            <br />
            <span>of {{ row.wage.maximumHoursPerWeek ?? '-' }} hrs weekly limit</span>
          </template>

          <template #hourlyRate-data="{ row }">
            <div>
              <RatePerHourList
                :rate-per-hour="row.wage.ratePerHour"
                :currency-symbol="NETWORK.currencySymbol"
                :class="'font-bold'"
              />
              <span class="">
                ≃ ${{ getHoulyRateInUserCurrency(row.wage.ratePerHour).toFixed(2) }}
                {{ currencyStore.localCurrency.code }} / Hour
              </span>
            </div>
          </template>

          <template #totalAmount-data="{ row }">
            <div>
              <RatePerHourTotalList
                :rate-per-hour="row.wage.ratePerHour"
                :currency-symbol="NETWORK.currencySymbol"
                :total-hours="getTotalHoursWorked(row.claims)"
                :class="'font-bold'"
              />
              <span class="">
                ≃ ${{
                  (
                    getTotalHoursWorked(row.claims) *
                    getHoulyRateInUserCurrency(row.wage.ratePerHour)
                  ).toFixed(2)
                }}
                {{ currencyStore.localCurrency.code }}
              </span>
            </div>
          </template>

          <template #action-data="{ row }">
            <CRSigne
              v-if="row.claims.length > 0 && row.wage.ratePerHour"
              :disabled="isSameWeek(row.weekStart)"
              :weekly-claim="{
                id: row.id, //which id do we use, individual or weekly claim?
                status: !row.status ? 'pending' : row.status,
                hoursWorked: getTotalHoursWorked(row.claims),
                createdAt: row.createdAt as string, //which date do we use, latest claim or weekly claim?
                wage: {
                  ratePerHour: row.wage.ratePerHour as RatePerHour,
                  userAddress: row.wage.userAddress as Address
                }
              }"
            />
            <CRWithdrawClaim
              :is-weekly-claim="true"
              :claim="{
                id: row.id, //which id do we use, individual or weekly claim?
                status: !row.status ? 'pending' : row.status,
                hoursWorked: getTotalHoursWorked(row.claims),
                createdAt: row.createdAt as string, //which date do we use, latest claim or weekly claim?
                signature: row.signature,
                wage: {
                  ratePerHour: row.wage.ratePerHour as RatePerHour,
                  userAddress: row.wage.userAddress as Address
                }
              }"
            />
          </template>
        </TableComponent>
      </div>
    </transition-group>
    <div v-if="isFetching" class="flex justify-center items-center p-4">
      <span class="text-gray-500">isFetching pending weekly claims...</span>
    </div>
    <!-- If empty -->
    <div
      v-if="data && data.length === 0 && !isFetching"
      class="flex justify-center items-center p-4"
    >
      <span class="text-gray-500">Congratulations You have approved all Weekly Claims</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import UserComponent from '@/components/UserComponent.vue'
import TableComponent, { type TableColumn } from '@/components/TableComponent.vue'
import { NETWORK } from '@/constant'
import { useTanstackQuery } from '@/composables/useTanstackQuery'
import { computed, watch } from 'vue'
import { useCurrencyStore } from '@/stores'
import { useUserDataStore, useTeamStore } from '@/stores'
import { type WeeklyClaimResponse, type RatePerHour } from '@/types'
import CRSigne from './CRSigne.vue'
import type { Address } from 'viem'
import CRWithdrawClaim from './CRWithdrawClaim.vue'
import { getMondayStart, getSundayEnd } from '@/utils/dayUtils'
// import { formatCurrencyShort } from '@/utils/currencyUtil'
import type { TokenId } from '@/constant'
import CRWeeklyClaimOwnerHeader from './CRWeeklyClaimOwnerHeader.vue'
import RatePerHourList from '@/components/RatePerHourList.vue'
import RatePerHourTotalList from '@/components/RatePerHourTotalList.vue'

function getTotalHoursWorked(claims: { hoursWorked: number; status: string }[]) {
  return claims.reduce((sum, claim) => sum + claim.hoursWorked, 0)
}

const userStore = useUserDataStore()
const teamStore = useTeamStore()

const weeklyClaimUrl = computed(
  () =>
    `/weeklyClaim/?status=pending&teamId=${teamStore.currentTeam?.id}${userStore.address !== teamStore.currentTeam?.ownerAddress ? `&memberAddress=${userStore.address}` : ''}`
)
const queryKey = computed(
  () => `pending-weekly-claims-${teamStore.currentTeam?.id}-${userStore.address}`
)
const { data, isLoading } = useTanstackQuery<WeeklyClaimResponse>(queryKey, weeklyClaimUrl)
const isFetching = computed(() => isLoading.value)

const isSameWeek = (weeklyClaimStartWeek: string) => {
  const currentMonday = getMondayStart(new Date())
  return currentMonday.toISOString() === weeklyClaimStartWeek
}

const currencyStore = useCurrencyStore()

function getHoulyRateInUserCurrency(
  ratePerHour: { type: string; amount: number }[],
  tokenStore = currencyStore
): number {
  return ratePerHour.reduce((total: number, rate) => {
    const tokenInfo = tokenStore.getTokenInfo(rate.type as TokenId)
    const localPrice = tokenInfo?.prices.find((p) => p.id === 'local')?.price ?? 0
    return total + rate.amount * localPrice
  }, 0)
}

function formatDate(date: string | Date) {
  const monday = getMondayStart(new Date(date))
  const sunday = getSundayEnd(new Date(date))
  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  return `${monday.toLocaleDateString('en-US', options)}-${sunday.toLocaleDateString('en-US', options)}`
}

function getCurrentMonthYear(date: string | Date) {
  const d = new Date(date)
  return d.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric'
  })
}

watch(data, (newVal) => {
  if (newVal) {
    console.log('New weekly claims: ', newVal)
  }
})

const columns = [
  {
    key: 'weekStart',
    label: 'Productivity Diary',
    // sortable: true,
    class: 'text-base'
  },
  {
    key: 'member',
    label: 'Member',
    sortable: false,
    class: 'text-base'
  },
  {
    key: 'hoursWorked',
    label: 'Hour Worked',
    sortable: false,
    class: 'text-base'
  },
  {
    key: 'hourlyRate',
    label: 'Hourly Rate',
    sortable: false,
    class: 'text-base'
  },
  {
    key: 'totalAmount',
    label: 'Total Amount',
    sortable: false,
    class: 'text-base'
  },
  {
    key: 'action',
    label: 'Action',
    sortable: false,
    class: 'text-base'
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
