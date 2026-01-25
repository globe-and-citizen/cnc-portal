<template>
  <CardComponent :title="singleUser ? 'Weekly Claim (User)' : 'Weekly Claim'" class="w-full pb-7">
    <TableComponent
      v-if="data"
      :rows="data"
      :columns="columns"
      :loading="isTeamClaimDataFetching"
      overflow="overflow-visible"
    >
      <template #member-data="{ row }">
        <RouterLink
          :to="{
            name: 'payroll-history',
            params: { id: teamStore.currentTeamId, memberAddress: row.member.address }
          }"
          class="flex items-center gap-2 hover:underline text-emerald-700"
        >
          <UserComponent :user="row.member" />
        </RouterLink>
      </template>

      <template #weekStart-data="{ row }">
        <span class="font-bold">{{
          dayjs(row.weekStart).utc().startOf('isoWeek').format('MMMM YYYY')
        }}</span>
        <br />
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
                getTotalHoursWorked(row.claims) * getHoulyRateInUserCurrency(row.wage.ratePerHour)
              ).toFixed(2)
            }}
            {{ currencyStore.localCurrency.code }}
          </span>
        </div>
      </template>
      <template #action-data="{ row }">
        <!--<CRSigne v-if="row.status == 'pending'" :weekly-claim="assertWeeklyClaimRow(row)" />
        <CRWithdrawClaim
          v-if="row.status == 'signed' || row.status == 'withdrawn'"
          :disabled="row.status == 'withdrawn' || userStore.address != row.wage.userAddress"
          :weekly-claim="assertWeeklyClaimRow(row)"
        />-->
        <WeeklyClaimActionDropdown :status="row.status" :weekly-claim="assertWeeklyClaimRow(row)" />
      </template>

      <template #status-data="{ row }">
        <template v-if="row.status === 'signed'">
          <span
            class="text-base px-3 py-1 rounded-2xl border-2 border-secondary text-secondary bg-transparent"
          >
            {{ row.status.charAt(0).toUpperCase() + row.status.slice(1) }}
          </span>
        </template>
        <template v-else-if="!row.status || row.status === 'pending'">
          <span
            class="text-base px-3 py-1 rounded-2xl border-2 border-gray-400 text-gray-700 bg-transparent"
          >
            {{ row.status ? row.status.charAt(0).toUpperCase() + row.status.slice(1) : 'Pending' }}
          </span>
        </template>
        <template v-else>
          <span
            class="text-base px-3 py-1 rounded-2xl border-2 border-yellow-500 text-black bg-transparent"
          >
            {{ row.status ? row.status.charAt(0).toUpperCase() + row.status.slice(1) : 'Pending' }}
          </span>
        </template>
      </template>
    </TableComponent>
  </CardComponent>
</template>

<script setup lang="ts">
import CardComponent from '@/components/CardComponent.vue'
import RatePerHourList from '@/components/RatePerHourList.vue'
import RatePerHourTotalList from '@/components/RatePerHourTotalList.vue'
import TableComponent, { type TableColumn } from '@/components/TableComponent.vue'
import UserComponent from '@/components/UserComponent.vue'
import type { TokenId } from '@/constant'
import { NETWORK } from '@/constant'
import { useCurrencyStore, useTeamStore /*, useUserDataStore*/ } from '@/stores'
import type { RatePerHour, WeeklyClaim } from '@/types/cash-remuneration'
import { formatIsoWeekRange } from '@/utils/dayUtils'
import dayjs from 'dayjs'
import isoWeek from 'dayjs/plugin/isoWeek'
import utc from 'dayjs/plugin/utc'
import weekday from 'dayjs/plugin/weekday'
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
// import CRSigne from '../CashRemunerationView/CRSigne.vue'
// import CRWithdrawClaim from '../CashRemunerationView/CRWithdrawClaim.vue'
import { useTeamWeeklyClaimsQuery } from '@/queries'
import WeeklyClaimActionDropdown from './WeeklyClaimActionDropdown.vue'
import type { Address } from 'viem'

dayjs.extend(utc)
dayjs.extend(isoWeek)
dayjs.extend(weekday)

function getTotalHoursWorked(claims: { hoursWorked: number }[]) {
  return claims.reduce((sum, claim) => sum + claim.hoursWorked, 0)
}

// const userStore = useUserDataStore()
const teamStore = useTeamStore()
// const userStore = useUserDataStore()
const props = defineProps<{
  memberAddress?: Address
  singleUser?: boolean
}>()

function assertWeeklyClaimRow(row: unknown): WeeklyClaim {
  return row as WeeklyClaim
}

const { data: fetchedData, error } = useTeamWeeklyClaimsQuery({
  teamId: computed(() => teamStore.currentTeamId),
  userAddress: props.memberAddress
})

// const { data: fetchedData, error } = useCustomFetch(weeklyClaimUrl.value).get().json()

// I think this sorting should be done in the backend
const data = computed(() => {
  if (!fetchedData.value) return null
  //return the most recent first date
  return [...fetchedData.value].sort((a, b) => {
    const dateA = new Date(a.weekStart).getTime()
    const dateB = new Date(b.weekStart).getTime()
    return dateB - dateA
  })
})

const isTeamClaimDataFetching = computed(() => !fetchedData.value && !error.value)

const currencyStore = useCurrencyStore()

function getHoulyRateInUserCurrency(
  ratePerHour: RatePerHour[],
  tokenStore = currencyStore
): number {
  return ratePerHour.reduce((total: number, rate: { type: TokenId; amount: number }) => {
    const tokenInfo = tokenStore.getTokenInfo(rate.type as TokenId)
    const localPrice = tokenInfo?.prices.find((p) => p.id === 'local')?.price ?? 0
    return total + rate.amount * localPrice
  }, 0)
}

const columns = [
  {
    key: 'weekStart',
    label: 'Productivity Diary',
    sortable: true,
    class: 'text-base '
  },
  {
    key: 'member',
    label: 'Member',
    sortable: false,
    class: 'text-base '
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
    key: 'status',
    label: 'Status',
    sortable: true,
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
