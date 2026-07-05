<template>
  <UCard class="w-full pb-7">
    <template #header>{{ singleUser ? 'Weekly Claim (User)' : 'Weekly Claim' }}</template>
    <UTable
      v-if="rows"
      :data="rows"
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
          {{ formatMinutesAsDuration(row.derived.totalMinutes) }}
        </span>
        <br />
        <span v-if="row.derived.hasOvertime">
          of {{ row.wage.maximumHoursPerWeek ?? '-' }} hrs weekly limit &amp;
          {{ row.wage.maximumOvertimeHoursPerWeek ?? '-' }} overtime hrs
        </span>
        <span v-else>of {{ row.wage.maximumHoursPerWeek ?? '-' }} hrs weekly limit</span>
      </template>

      <template #hourlyRate-cell="{ row: { original: row } }">
        <div>
          <RatePerHourList
            :rate-per-hour="row.wage.ratePerHour"
            :currency-symbol="NETWORK.currencySymbol"
            :class="'font-bold'"
          />
          <span class="">
            ≃ ${{ row.derived.hourlyRateInUserCurrency.toFixed(2) }}
            {{ currencyStore.localCurrency.code }} / Hour
          </span>
          <template v-if="row.derived.hasOvertime">
            <div class="mt-2 text-xs font-semibold text-gray-500 uppercase">Overtime</div>
            <RatePerHourList
              :rate-per-hour="row.wage.overtimeRatePerHour ?? []"
              :currency-symbol="NETWORK.currencySymbol"
              :class="'font-bold'"
            />
            <span class="">
              ≃ ${{ row.derived.overtimeHourlyRateInUserCurrency.toFixed(2) }}
              {{ currencyStore.localCurrency.code }} / Hour
            </span>
          </template>
        </div>
      </template>

      <template #totalAmount-cell="{ row: { original: row } }">
        <div>
          <RatePerHourTotalList
            :rate-per-hour="row.derived.tokenAmounts"
            :currency-symbol="NETWORK.currencySymbol"
            :total-hours="1"
            :class="'font-bold'"
          />
          <span class="">
            ≃ ${{ row.derived.totalInUserCurrency.toFixed(2) }}
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
          <!-- Surface stale signatures (signed against a previous Officer's
               CashRemunerationEIP712) so the approver knows a Re-sign is
               required before withdrawal works on the current contract. -->
          <span
            v-if="isStaleSignature(row)"
            class="ml-2 rounded-2xl border-2 border-amber-500 bg-amber-50 px-3 py-1 text-sm text-amber-700"
            data-test="needs-resigning-badge"
          >
            Needs re-signing
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
    <template #footer>
      <TablePagination
        v-model:page="page"
        v-model:page-size="pageSize"
        :total="total"
        noun="claims"
        data-test-prefix="weekly-claim"
      />
    </template>
  </UCard>
</template>

<script setup lang="ts">
import RatePerHourList from '@/components/RatePerHourList.vue'
import RatePerHourTotalList from '@/components/RatePerHourTotalList.vue'
import type { TableColumn } from '@nuxt/ui'
import UserComponent from '@/components/ui/UserComponent.vue'
import type { TokenId } from '@/constant'
import { NETWORK } from '@/constant'
import { useCurrencyStore, useTeamStore /*, useUserDataStore*/ } from '@/stores'
import type { SupportedTokens, WeeklyClaim } from '@/types/cash-remuneration'
import { formatIsoWeekRange } from '@/utils/dayUtils'
import dayjs from 'dayjs'
import isoWeek from 'dayjs/plugin/isoWeek'
import utc from 'dayjs/plugin/utc'
import weekday from 'dayjs/plugin/weekday'
import { computed, watch } from 'vue'
import { RouterLink } from 'vue-router'
// import CRSigne from '../CashRemunerationView/CRSigne.vue'
// import CRWithdrawClaim from '../CashRemunerationView/CRWithdrawClaim.vue'
import { useGetTeamWeeklyClaimsQuery } from '@/queries'
import WeeklyClaimActionDropdown from './WeeklyClaimActionDropdown.vue'
import TablePagination from '@/components/ui/TablePagination.vue'
import { usePagination } from '@/composables/usePagination'
import type { Address } from 'viem'
import { computeClaimTokenAmounts, formatMinutesAsDuration } from '@/utils/wageUtil'

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

const currentCashRemunerationAddress = computed(() =>
  teamStore.getContractAddressByType('CashRemunerationEIP712')
)

// True iff the row's stored verifying contract diverges from the team's
// current CashRemunerationEIP712. Drives the "needs re-signing" badge —
// see WeeklyClaimActionDropdown.vue for the matching action swap.
function isStaleSignature(row: WeeklyClaim): boolean {
  const signedAgainst = row.signedAgainstContractAddress
  const current = currentCashRemunerationAddress.value
  if (!signedAgainst || !current) return false
  return signedAgainst.toLowerCase() !== current.toLowerCase()
}

// Pagination state — `pageSize` maps to the backend's `limit` query param.
// The backend sorts by weekStart desc when paginated, so no client-side sort.
// Page + size are mirrored to the route query (shareable, reload-safe) and the
// size selector re-anchors the page so the current first row stays in view.
// `weeklyClaim` key namespaces the query params — WeeklyClaimView renders this
// table alongside CashRemunerationTransactions on the same route. Default page
// size is 20, matching every other paginated section.
const { page, pageSize, reset } = usePagination(() => total.value, { key: 'weeklyClaim' })

const { data: fetchedData, error } = useGetTeamWeeklyClaimsQuery({
  queryParams: {
    teamId: computed(() => teamStore.currentTeamId),
    userAddress: computed(() => props.memberAddress),
    page,
    limit: pageSize
  }
})

type TokenAmount = { type: SupportedTokens; amount: number }

type EnrichedWeeklyClaim = WeeklyClaim & {
  derived: {
    totalMinutes: number
    hasOvertime: boolean
    tokenAmounts: TokenAmount[]
    totalInUserCurrency: number
    hourlyRateInUserCurrency: number
    overtimeHourlyRateInUserCurrency: number
  }
}

// Every per-row derived value (split hours, combined regular+overtime payout,
// local-currency totals) is computed once here so the cells just read it back
// instead of recomputing on each render.
const rows = computed<EnrichedWeeklyClaim[] | null>(() => {
  const data = fetchedData.value?.data
  if (!data) return null

  return data.map((row) => {
    const totalMinutes = getTotalTimeWorked(row.claims)
    const overtimeRates = row.wage.overtimeRatePerHour ?? []
    const tokenAmounts = computeClaimTokenAmounts(totalMinutes, row.wage)

    return {
      ...row,
      derived: {
        totalMinutes,
        hasOvertime: overtimeRates.length > 0,
        tokenAmounts,
        totalInUserCurrency: sumInUserCurrency(tokenAmounts),
        hourlyRateInUserCurrency: sumInUserCurrency(row.wage.ratePerHour),
        overtimeHourlyRateInUserCurrency: sumInUserCurrency(overtimeRates)
      }
    }
  })
})
const total = computed(() => fetchedData.value?.total ?? 0)

// Switching between the team-wide table and a single member's view changes the
// underlying result set — go back to page 1 so we never land out of range.
watch(() => props.memberAddress, reset)

const isTeamClaimDataFetching = computed(() => !fetchedData.value && !error.value)

const currencyStore = useCurrencyStore()

// Converts a list of token amounts (rates or payouts) into the user's local
// currency. Reused for hourly rate, overtime rate and the weekly total.
function sumInUserCurrency(
  amounts: Array<{ type: SupportedTokens; amount: number }>,
  tokenStore = currencyStore
): number {
  return amounts.reduce((total, { type, amount }) => {
    const tokenInfo = tokenStore.getTokenInfo(type as TokenId)
    const localPrice = tokenInfo?.prices.find((p) => p.id === 'local')?.price ?? 0
    return total + amount * localPrice
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
] as TableColumn<EnrichedWeeklyClaim>[]
</script>
