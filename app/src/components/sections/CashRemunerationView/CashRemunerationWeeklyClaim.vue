<template>
  <pre>
    {{ data }}
    {{ error }}
</pre> 
  <CardComponent title="Weekly Claim" class="w-full pb-7">
    <WeeklyClaimComponent>
      <TableComponent
        :rows="teamClaimData ?? undefined"
        :columns="columns"
        :loading="isTeamClaimDataFetching"
      >
        <template #createdAt-data="{ row }">
          <span>
            {{ formatDate(row.createdAt) }}
          </span>
        </template>
        
        <template #member-data="{ row }">
          <UserComponent v-if="row.wage && row.wage.user" :user="row.wage.user" />
        </template>
        <template #hoursWorked-data="{ row }">
          <span class="font-bold">
            {{ row.hoursWorked }}<span v-if="row.wage"> / {{ row.wage.maximumHoursPerWeek }} h</span>
          </span>
          <br v-if="row.wage" />
          <span v-if="row.wage">{{ row.wage.maximumHoursPerWeek }} h/week</span>
        </template>
        <template #hourlyRate-data="{ row }">
          <span v-if="row.wage" class="font-bold">
            {{ row.wage.cashRatePerHour }} {{ NETWORK.currencySymbol }} / h
          </span>
        </template>
        <template #status-data="{ row }">
          <span
            class="badge"
            :class="{
              'badge-info': row.status === 'pending',
              'badge-outline': row.status === 'signed',
              'bg-error': row.status === 'disabled',
              'bg-neutral text-white': row.status === 'withdrawn'
            }"
          >
            {{
              row.status == 'pending'
                ? 'Submitted'
                : row.status == 'signed'
                  ? 'Approved'
                  : row.status.charAt(0).toUpperCase() + row.status.slice(1)
            }}
          </span>
        </template>
        <template #action-data="{ row }">
          <CRSigne :claim="row" @claim-signed="fetchTeamClaimData()" />
          <CRWithdrawClaim :claim="row" @claim-withdrawn="fetchTeamClaimData()" />
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
// Formatage de date façon dayUtils
function formatDate(date: string | Date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
}

// const weeklyClaimUrl = computed(() => `/weeklyClaim/?teamId=${teamStore.teamId}`)

const { data, error } = useCustomFetch('/weeklyClaim/?teamId=1').get().json()

// Table columns configuration
const columns = [
  {
    key: 'weekStart',
    label: 'Début de semaine',
    sortable: true,
    class: 'text-black text-base'
  },
  {
    key: 'claims',
    label: 'Claims',
    sortable: false,
    class: 'text-black text-base'
  },
  {
    key: 'createdAt',
    label: 'Date',
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