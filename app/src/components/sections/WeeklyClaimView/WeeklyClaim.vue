<template>
  <CardComponent :title="singleUser ? 'Weekly Claim (User)' : 'Weekly Claim'" class="w-full pb-7">
    <TableComponent v-if="data" :rows="data" :columns="columns" :loading="isTeamClaimDataFetching">
      <template #member-data="{ row }">
        <RouterLink
          :to="{
            name: 'cash-remunerations-member',
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
            {{
              (
                getTotalHoursWorked(row.claims) *
                Number(
                  getHoulyRateInUserCurrency(
                    row.wage.cashRatePerHour ??
                      row.wage.tokenRatePerHour ??
                      row.wage.usdcRatePerHour
                  )
                )
              ).toFixed(2)
            }}
            {{ NETWORK.nativeTokenSymbol }} / USD
          </span>
          <div class="flex">
            <span class=""> {{ row.wage.cashRatePerHour }} {{ NETWORK.currencySymbol }} </span>

            <span class=""> {{ row.wage.tokenRatePerHour }} ,TOKEN, </span>

            <span class=""> {{ row.wage.usdcRatePerHour }} USDC </span>
          </div>
        </div>
      </template>

      <template #totalAmount-data="{ row }">
        <div>
          <span class="font-bold">
            ≃
            {{
              (
                getTotalHoursWorked(row.claims) *
                Number(
                  getHoulyRateInUserCurrency(
                    row.wage.cashRatePerHour ??
                      row.wage.tokenRatePerHour ??
                      row.wage.usdcRatePerHour
                  )
                )
              ).toFixed(2)
            }}
            {{ NETWORK.nativeTokenSymbol }} / USD
          </span>

          <div class="flex">
            <span>
              {{ getTotalHoursWorked(row.claims) * row.wage.cashRatePerHour }}
              {{ NETWORK.currencySymbol }}
            </span>

            <span>
              {{ getTotalHoursWorked(row.claims) * row.wage.tokenRatePerHour }}
              ,TOKEN,
            </span>

            <span>
              {{ getTotalHoursWorked(row.claims) * row.wage.usdcRatePerHour }}
              USDC
            </span>
          </div>
        </div>
      </template>

      <!-- <template #action-data="{}">
        <ButtonUI class="btn btn-success btn-sm" type="button"> Approve </ButtonUI>
      </template> -->
    </TableComponent>
  </CardComponent>
</template>

<script setup lang="ts">
import CardComponent from '@/components/CardComponent.vue'
import TableComponent, { type TableColumn } from '@/components/TableComponent.vue'
import UserComponent from '@/components/UserComponent.vue'
import { NETWORK } from '@/constant'
import { useCustomFetch } from '@/composables/useCustomFetch'
import { computed } from 'vue'
import { useCurrencyStore } from '@/stores'
import { useUserDataStore, useTeamStore } from '@/stores'
import { RouterLink } from 'vue-router'

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
const getHoulyRateInUserCurrency = (rate: number) => {
  const nativeTokenInfo = currencyStore.getTokenInfo('native')
  const price = nativeTokenInfo?.prices.find((p) => p.id == 'local')?.price || 0
  return (rate * price).toFixed(2)
}
function formatDate(date: string | Date) {
  const d = new Date(date)
  // Get Monday (start of week)
  const day = d.getDay()
  const diffToMonday = (day === 0 ? -6 : 1) - day
  const monday = new Date(d)
  monday.setDate(d.getDate() + diffToMonday)
  // Get Sunday (end of week)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  // Format as "Dec 23-Dec 29"
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
