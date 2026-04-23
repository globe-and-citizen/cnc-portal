<template>
  <UCard class="w-full pb-7">
    <template #header>{{ singleUser ? 'Weekly Claim (User)' : 'Weekly Claim' }}</template>
    <UTable
      v-if="data"
      :data="data"
      :columns="columns"
      :loading="isTeamClaimDataFetching"
      overflow="overflow-visible"
    >
      <template #member-cell="{ row: { original: row } }">
        <RouterLink
          v-if="row.member"
          :to="{
            name: 'payroll-history',
            params: { id: teamStore.currentTeamId, memberAddress: row.member.address }
          }"
          class="flex items-center gap-2 text-emerald-700 hover:underline"
        >
          <UserComponent :user="row.member" />
        </RouterLink>
        <span v-else>-</span>
      </template>

      <template #weekStart-cell="{ row: { original: row } }">
        <span class="font-bold">{{
          dayjs(row.weekStart).utc().startOf('isoWeek').format('MMMM YYYY')
        }}</span>
        <br />
        <span>{{ formatIsoWeekRange(dayjs(row.weekStart).utc().startOf('isoWeek')) }}</span>
      </template>

      <template #minutesWorked-cell="{ row: { original: row } }">
        <span class="font-bold">
          {{ formatMinutesAsDuration(getTotalTimeWorked(row.claims)) }}
        </span>
        <br />
        <span>of {{ row.wage.maximumHoursPerWeek ?? '-' }} hrs weekly limit</span>
      </template>

      <template #hourlyRate-cell="{ row: { original: row } }">
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

      <template #totalAmount-cell="{ row: { original: row } }">
        <div>
          <RatePerHourTotalList
            :rate-per-hour="row.wage.ratePerHour"
            :currency-symbol="NETWORK.currencySymbol"
            :total-hours="getTotalTimeWorked(row.claims) / 60"
            :class="'font-bold'"
          />
          <span class="">
            ≃ ${{
              (
                (getTotalTimeWorked(row.claims) / 60) *
                getHoulyRateInUserCurrency(row.wage.ratePerHour)
              ).toFixed(2)
            }}
            {{ currencyStore.localCurrency.code }}
          </span>
        </div>
      </template>
      <template #action-cell="{ row: { original: row } }">
        <!--<CRSigne v-if="row.status == 'pending'" :weekly-claim="assertWeeklyClaimRow(row)" />
        <CRWithdrawClaim
          v-if="row.status == 'signed' || row.status == 'withdrawn'"
          :disabled="row.status == 'withdrawn' || userStore.address != row.wage.userAddress"
          :weekly-claim="assertWeeklyClaimRow(row)"
        />-->
        <WeeklyClaimActionDropdown :status="row.status" :weekly-claim="assertWeeklyClaimRow(row)" />
      </template>

      <template #status-cell="{ row: { original: row } }">
        <template v-if="row.status === 'signed'">
          <span
            class="border-secondary text-secondary rounded-2xl border-2 bg-transparent px-3 py-1 text-base"
          >
            {{ row.status.charAt(0).toUpperCase() + row.status.slice(1) }}
          </span>
        </template>
        <template v-else-if="!row.status || row.status === 'pending'">
          <span
            class="rounded-2xl border-2 border-gray-400 bg-transparent px-3 py-1 text-base text-gray-700"
          >
            {{ row.status ? row.status.charAt(0).toUpperCase() + row.status.slice(1) : 'Pending' }}
          </span>
        </template>
        <template v-else>
          <span
            class="rounded-2xl border-2 border-yellow-500 bg-transparent px-3 py-1 text-base text-black"
          >
            {{ row.status ? row.status.charAt(0).toUpperCase() + row.status.slice(1) : 'Pending' }}
          </span>
        </template>
      </template>
    </UTable>
  </UCard>
</template>

<script setup lang="ts">
import RatePerHourList from '@/components/RatePerHourList.vue'
import RatePerHourTotalList from '@/components/RatePerHourTotalList.vue'
import type { TableColumn } from '@nuxt/ui'
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
import { useGetTeamWeeklyClaimsQuery } from '@/queries'
import WeeklyClaimActionDropdown from './WeeklyClaimActionDropdown.vue'
import type { Address } from 'viem'
import { formatMinutesAsDuration } from '@/utils/wageUtil'

dayjs.extend(utc)
dayjs.extend(isoWeek)
dayjs.extend(weekday)

function getTotalTimeWorked(claims: { minutesWorked: number }[]) {
  return claims.reduce((sum, claim) => sum + claim.minutesWorked, 0)
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

const { data: fetchedData, error } = useGetTeamWeeklyClaimsQuery({
  queryParams: {
    teamId: computed(() => teamStore.currentTeamId),
    userAddress: computed(() => props.memberAddress)
  }
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
    accessorKey: 'weekStart',
    header: 'Productivity Diary',
    enableSorting: true
  },
  {
    accessorKey: 'member',
    header: 'Member',
    enableSorting: false
  },
  {
    accessorKey: 'minutesWorked',
    header: 'Hour Worked',
    enableSorting: false
  },
  {
    accessorKey: 'hourlyRate',
    header: 'Hourly Rate',
    enableSorting: false
  },
  {
    accessorKey: 'totalAmount',
    header: 'Total Amount',
    enableSorting: false
  },
  {
    accessorKey: 'status',
    header: 'Status',
    enableSorting: true
  },
  {
    accessorKey: 'action',
    header: 'Action',
    enableSorting: false
  }
] as TableColumn<WeeklyClaim>[]
</script>
