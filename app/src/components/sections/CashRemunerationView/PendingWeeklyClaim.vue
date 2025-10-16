<template>
  <div>
    <CRWeeklyClaimOwnerHeader />
    <transition-group name="stack" tag="div" class="stack w-full">
      <div
        v-for="(item, index) in data?.filter(
          (weeklyClaim) => weeklyClaim.weekStart < currentWeekStart
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
            <span class="font-bold line-clamp-1">{{
              dayjs(row.weekStart).utc().startOf('isoWeek').format('MMMM YYYY')
            }}</span>

            <span>{{ formatIsoWeekRange(dayjs(row.weekStart).utc().startOf('isoWeek')) }}</span>
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
                ≃ ${{ getHourlyRateInUserCurrency(row.wage.ratePerHour).toFixed(2) }}
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
                    getHourlyRateInUserCurrency(row.wage.ratePerHour)
                  ).toFixed(2)
                }}
                {{ currencyStore.localCurrency.code }}
              </span>
            </div>
          </template>
          <template #action-data="{ row }">
            <CRSigne
              v-if="row.claims.length > 0 && row.wage.ratePerHour"
              :disabled="row.weekStart === currentWeekStart"
              :weekly-claim="row as WeeklyClaim"
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
import TableComponent, { type TableColumn } from '@/components/TableComponent.vue'
import UserComponent from '@/components/UserComponent.vue'
import { useTanstackQuery } from '@/composables/useTanstackQuery'
import { NETWORK } from '@/constant'
import { useCurrencyStore, useTeamStore, useToastStore, useUserDataStore } from '@/stores'
import {  type WeeklyClaim } from '@/types'
import dayjs from 'dayjs'
import isoWeek from 'dayjs/plugin/isoWeek'
import utc from 'dayjs/plugin/utc'
import weekday from 'dayjs/plugin/weekday'
import { computed, watch } from 'vue'
import CRSigne from './CRSigne.vue'
// import CRWithdrawClaim from './CRWithdrawClaim.vue'
import CashRemuneration_ABI from '@/artifacts/abi/CashRemunerationEIP712.json'
import RatePerHourList from '@/components/RatePerHourList.vue'
import RatePerHourTotalList from '@/components/RatePerHourTotalList.vue'
import type { TokenId } from '@/constant'
import { formatIsoWeekRange } from '@/utils/dayUtils'
import { useReadContract } from '@wagmi/vue'
import CRWeeklyClaimOwnerHeader from './CRWeeklyClaimOwnerHeader.vue'

dayjs.extend(utc)
dayjs.extend(isoWeek)
dayjs.extend(weekday)

const currentWeekStart = dayjs().utc().startOf('isoWeek').toISOString()

const userStore = useUserDataStore()
const teamStore = useTeamStore()
const currencyStore = useCurrencyStore()

const cashRemunerationAddress = computed(() =>
  teamStore.getContractAddressByType('CashRemunerationEIP712')
)
const isCashRemunerationOwner = computed(() => cashRemunerationOwner.value === userStore.address)

const weeklyClaimUrl = computed(
  () =>
    `/weeklyClaim/?teamId=${teamStore.currentTeam?.id}${!isCashRemunerationOwner.value ? `&memberAddress=${userStore.address}` : ''}`
)
const queryKey = computed(() => [
  'weekly-claims',
  teamStore.currentTeam?.id,
  userStore.address,
  'pending'
])

const { data: loadedData, isLoading } = useTanstackQuery<WeeklyClaim[]>(queryKey, weeklyClaimUrl)
const isFetching = computed(() => isLoading.value)

const data = computed(() =>
  loadedData.value?.filter(
    (weeklyClaim) =>
      weeklyClaim.status === 'pending' ||
      (weeklyClaim.status === 'signed' &&
        weeklyClaim.data.ownerAddress !== cashRemunerationOwner.value)
  )
)

const {
  data: cashRemunerationOwner,
  // isFetching: isCashRemunerationOwnerFetching,
  error: cashRemunerationOwnerError
} = useReadContract({
  functionName: 'owner',
  address: cashRemunerationAddress,
  abi: CashRemuneration_ABI
})

function getHourlyRateInUserCurrency(
  ratePerHour: { type: string; amount: number }[],
  tokenStore = currencyStore
): number {
  return ratePerHour.reduce((total: number, rate) => {
    const tokenInfo = tokenStore.getTokenInfo(rate.type as TokenId)
    const localPrice = tokenInfo?.prices.find((p) => p.id === 'local')?.price ?? 0
    return total + rate.amount * localPrice
  }, 0)
}

function getTotalHoursWorked(claims: { hoursWorked: number; status: string }[]) {
  return claims.reduce((sum, claim) => sum + claim.hoursWorked, 0)
}

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

watch(cashRemunerationOwnerError, (value) => {
  if (value) {
    console.log('New cash remuneration owner: ', value)
    useToastStore().addErrorToast('Failed to fetch cash remuneration owner')
  }
})
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
