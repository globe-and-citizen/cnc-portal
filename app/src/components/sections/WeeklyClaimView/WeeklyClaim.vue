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
          <span class="font-bold">
            ≃
            {{ getHoulyRateInUserCurrency(row.wage.ratePerHour).toFixed(2) }}
            {{ currencyStore.localCurrency.code }} / Hour
          </span>

          <div class="flex">
            <span>
              {{ getHourlyRate(row.wage.ratePerHour, 'native') }} {{ NETWORK.currencySymbol }},
            </span>

            <span> {{ getHourlyRate(row.wage.ratePerHour, 'sher') }} TOKEN , </span>

            <span> {{ getHourlyRate(row.wage.ratePerHour, 'usdc') }} USDC </span>
          </div>
        </div>
      </template>

      <template #totalAmount-data="{ row }">
        <div>
          <span class="font-bold">
            ≃
            {{
              (
                getTotalHoursWorked(row.claims) * getHoulyRateInUserCurrency(row.wage.ratePerHour)
              ).toFixed(2)
            }}
            {{ currencyStore.localCurrency.code }}
          </span>
          <div>
            <span>
              {{
                getHourlyRate(row.wage.ratePerHour, 'native') === 'N/A'
                  ? 'N/A'
                  : Number(getHourlyRate(row.wage.ratePerHour, 'native')) *
                    getTotalHoursWorked(row.claims)
              }}
              {{ NETWORK.currencySymbol }},
            </span>

            <span>
              {{
                getHourlyRate(row.wage.ratePerHour, 'sher') === 'N/A'
                  ? 'N/A'
                  : Number(getHourlyRate(row.wage.ratePerHour, 'sher')) *
                    getTotalHoursWorked(row.claims)
              }}
              TOKEN ,
            </span>

            <span>
              {{
                getHourlyRate(row.wage.ratePerHour, 'usdc') === 'N/A'
                  ? 'N/A'
                  : Number(getHourlyRate(row.wage.ratePerHour, 'usdc')) *
                    getTotalHoursWorked(row.claims)
              }}
              USDC
            </span>
          </div>
        </div>
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
import type { RatePerHour, SupportedTokens } from '@/types/cash-remuneration'
import type { TokenId } from '@/constant'

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
function formatDate(date: string | Date) {
  const monday = getMondayStart(new Date(date))
  const sunday = getSundayEnd(new Date(date))
  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  const locale = navigator.language || 'en-US'
  return `${monday.toLocaleDateString(locale, options)}-${sunday.toLocaleDateString(locale, options)}`
}

function getCurrentMonthYear(date: string | Date) {
  const d = new Date(date)
  const locale = navigator.language || 'en-US'
  return d.toLocaleDateString(locale, {
    month: 'long',
    year: 'numeric'
  })
}

const columns = [
  {
    key: 'weekStart',
    label: 'Productivity Diary',
    // sortable: true,
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
  }
] as TableColumn[]
</script>
