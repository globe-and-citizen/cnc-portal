<template>
  <div>
    <CRWeeklyClaimHeader />
    <transition-group name="stack" tag="div" class="stack w-full">
      <div
        v-for="(item, index) in data?.filter((weeklyClaim) => weeklyClaim.status === null)"
        :key="item.weekStart"
        class="card shadow-md bg-white p-4"
        :class="{
          'transition -translate-y-full opacity-0  duration-1000': index === 0
        }"
      >
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
                {{ getHourlyRate(row.wage.ratePerHour, 'native') }} {{ NETWORK.currencySymbol }}
              </span>
              <br />
              <span class="font-bold">
                {{ getHourlyRate(row.wage.ratePerHour, 'sher') }} TOKEN
              </span>
              <br />
              <span class="font-bold">
                {{ getHourlyRate(row.wage.ratePerHour, 'usdc') }} USDC
              </span>
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
  </div>
</template>

<script setup lang="ts">
import UserComponent from '@/components/UserComponent.vue'
import TableComponent, { type TableColumn } from '@/components/TableComponent.vue'
import { NETWORK } from '@/constant'
import { useCustomFetch } from '@/composables/useCustomFetch'
import { computed, watch } from 'vue'
import { useCurrencyStore } from '@/stores'
import { useUserDataStore, useTeamStore } from '@/stores'
import { type WeeklyClaimResponse, type RatePerHour, type SupportedTokens } from '@/types'
import CRSigne from './CRSigne.vue'
import type { Address } from 'viem'
import CRWithdrawClaim from './CRWithdrawClaim.vue'
import { getMondayStart } from '@/utils/dayUtils'
import { formatCurrencyShort } from '@/utils/currencyUtil'
import type { TokenId } from '@/constant'
import CRWeeklyClaimHeader from './CRWeeklyClaimHeader.vue'

function getTotalHoursWorked(claims: { hoursWorked: number; status: string }[]) {
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

const { data, error } = useCustomFetch(weeklyClaimUrl.value).get().json<WeeklyClaimResponse>()

const isTeamClaimDataFetching = computed(() => !data.value && !error.value)

const isSameWeek = (weeklyClaimStartWeek: string) => {
  console.log(`weeklyClaimStartWeek: ${weeklyClaimStartWeek}`)
  const currentMonday = getMondayStart(new Date())
  return currentMonday.toISOString() === weeklyClaimStartWeek
}

const currencyStore = useCurrencyStore()
function getHoulyRateInUserCurrency(hourlyRate: number, tokenId: TokenId = 'native') {
  const tokenInfo = currencyStore.getTokenInfo(tokenId)
  const localPrice = tokenInfo?.prices.find((p) => p.id === 'local')?.price ?? 0
  const code = currencyStore.localCurrency.code
  return formatCurrencyShort(hourlyRate * localPrice, code)
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

watch(data, (newVal) => {
  if (newVal) {
    console.log('New weekly claims: ', newVal)
  }
})

const columns = [
  {
    key: 'weekStart',
    label: 'Week Start On',
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
