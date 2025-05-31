<template>
 <pre>
 {{data}}
 {{error}}
 
   </pre>
  <CardComponent title="Weekly Claim" class="w-full pb-7">
    <WeeklyClaimComponent>
      <TableComponent :rows="flatClaims" :columns="columns" :loading="isTeamClaimDataFetching">
        <template #weekStart-data="{ row }">
          <span>{{ formatDate(row.weekStart) }}</span>
        </template>
        <template #memberAddress-data="{ row }">
          <UserComponent v-if="row.wage && row.wage.user" :user="row.wage.user" />
        </template>
        <template #hoursWorked-data="{ row }">
          <span class="font-bold">
            {{ row.hoursWorked }} / {{ row.wage.maximumHoursPerWeek }} h
          </span>
          <br />
          <span>{{ row.wage.maximumHoursPerWeek }} h/week</span>
        </template>
      </TableComponent>
    </WeeklyClaimComponent>
  </CardComponent>
</template>

<script setup lang="ts">
import CardComponent from '@/components/CardComponent.vue'
import WeeklyClaimComponent from '@/components/WeeklyClaimComponent.vue'
import TableComponent, { type TableColumn, type TableRow } from '@/components/TableComponent.vue'
import UserComponent from '@/components/UserComponent.vue'
import CRSigne from './CRSigne.vue'
import CRWithdrawClaim from './CRWithdrawClaim.vue'
import { NETWORK } from '@/constant'
import { useCustomFetch } from '@/composables/useCustomFetch'
import { computed } from 'vue'

const flatClaims = computed(() => {
  if (!data.value) return []
  return data.value.flatMap((weeklyClaim: any) =>
    (weeklyClaim.claims || []).map((claim: any) => ({
      ...claim,
      weekStart: weeklyClaim.weekStart,
      memberAddress: weeklyClaim.memberAddress,
    }))
  )
})


// Formatage de date façon dayUtils
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

const { data, error } = useCustomFetch('/weeklyClaim/?teamId=1').get().json()

const columns = [
  {
    key: 'weekStart',
    label: 'Date',
    sortable: true,
    class: 'text-black text-base'
  },
  {
    key: 'memberAddress',
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
    key: 'status',
    label: 'Status',
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
