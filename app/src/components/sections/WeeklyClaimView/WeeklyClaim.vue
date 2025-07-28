<template>
  <CardComponent :title="singleUser ? 'Weekly Claim (User)' : 'Weekly Claim'" class="w-full pb-7">
    <TableComponent v-if="data" :rows="data" :columns="columns" :loading="isTeamClaimDataFetching">
      <template #member-data="{ row }">
        <RouterLink
          :to="{
            name: 'claim-history',
            params: { id: teamStore.currentTeam?.id, memberAddress: row.member.address }
          }"
          class="flex items-center gap-2 hover:underline text-emerald-700"
        >
          <UserComponent :user="row.member" />
        </RouterLink>
      </template>

      <template #weekStart-data="{ row }">
        <span class="font-bold">{{ getCurrentMonthYear(row.weekStart) }}</span>
        <br />
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
                getTotalHoursWorked(row.claims) * getHoulyRateInUserCurrency(row.wage.ratePerHour)
              ).toFixed(2)
            }}
            {{ currencyStore.localCurrency.code }}
          </span>
        </div>
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
        <!-- <br />
        <span class="text-sm">
          {{ row.createdAt ? new Date(row.createdAt).toLocaleDateString() : '-' }}
        </span> -->
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
import { getMondayStart, getSundayEnd } from '@/utils/dayUtils'
import { computed } from 'vue'
import { useCurrencyStore } from '@/stores'
import { useUserDataStore, useTeamStore } from '@/stores'
import { RouterLink } from 'vue-router'
import type { RatePerHour } from '@/types/cash-remuneration'
import type { TokenId } from '@/constant'
import RatePerHourList from '@/components/RatePerHourList.vue'
import RatePerHourTotalList from '@/components/RatePerHourTotalList.vue'

function getTotalHoursWorked(claims: { hoursWorked: number }[]) {
  return claims.reduce((sum, claim) => sum + claim.hoursWorked, 0)
}

const userStore = useUserDataStore()
const teamStore = useTeamStore()
const props = defineProps<{
  memberAddress?: string
  singleUser?: boolean
}>()

const weeklyClaimUrl = computed(
  () =>
    `/weeklyClaim/?teamId=${teamStore.currentTeam?.id}${
      props.memberAddress
        ? `&memberAddress=${props.memberAddress}`
        : userStore.address !== teamStore.currentTeam?.ownerAddress
          ? `&memberAddress=${userStore.address}`
          : ''
    }`
)

const { data, error } = useCustomFetch(weeklyClaimUrl.value).get().json()

const isTeamClaimDataFetching = computed(() => !data.value && !error.value)

const currencyStore = useCurrencyStore()

function getHoulyRateInUserCurrency(ratePerHour: RatePerHour, tokenStore = currencyStore): number {
  return ratePerHour.reduce((total: number, rate: { type: TokenId; amount: number }) => {
    const tokenInfo = tokenStore.getTokenInfo(rate.type as TokenId)
    const localPrice = tokenInfo?.prices.find((p) => p.id === 'local')?.price ?? 0
    return total + rate.amount * localPrice
  }, 0)
}

// const getHourlyRate = (ratePerHour: RatePerHour, type: SupportedTokens) => {
//   switch (type) {
//     case 'native':
//       return ratePerHour.find((rate) => rate.type === 'native')
//         ? ratePerHour.find((rate) => rate.type === 'native')!.amount
//         : 'N/A'
//     case 'sher':
//       return ratePerHour.find((rate) => rate.type === 'sher')
//         ? ratePerHour.find((rate) => rate.type === 'sher')!.amount
//         : 'N/A'
//     case 'usdc':
//       return ratePerHour.find((rate) => rate.type === 'usdc')
//         ? ratePerHour.find((rate) => rate.type === 'usdc')!.amount
//         : 'N/A'
//     default:
//       return 'N/A'
//   }
// }
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

const columns = [
  {
    key: 'weekStart',
    label: 'Productivity Diary',
    // sortable: true,
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
    sortable: false,
    class: 'text-base'
  }
] as TableColumn[]
</script>
