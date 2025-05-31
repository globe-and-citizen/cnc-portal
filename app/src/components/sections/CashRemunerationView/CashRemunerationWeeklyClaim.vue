<template>
<!-- <pre>
{{data}}
{{error}}
</pre> -->
  <CardComponent title="Weekly Claim" class="w-full pb-7">
    <WeeklyClaimComponent>
      <TableComponent :rows="flatClaims" :columns="columns" :loading="isTeamClaimDataFetching">
        <template #weekStart-data="{ row }">
          <span>{{ formatDate(row.weekStart) }}</span>
        </template>
        <template #memberAddress-data="{ row }">
          <!-- Affiche UserComponent si tu as une fonction getUserByAddress, sinon juste l'adresse -->
          <UserComponent
            v-if="getUserByAddress && getUserByAddress(row.memberAddress)"
            :user="getUserByAddress(row.memberAddress)"
          />
          <span v-else>{{ row.memberAddress }}</span>
        </template>
        <template #hoursWorked-data="{ row }">
          <span class="font-bold">
            {{ row.hoursWorked }} / {{ row.wage?.maximumHoursPerWeek ?? '-' }} h
          </span>
          <br />
          <span>{{ row.wage?.maximumHoursPerWeek }} h/week</span>
        </template>
        <template #hourlyRate-data="{ row }">
          <span class="font-bold">
            {{ row.wage?.cashRatePerHour }} {{ NETWORK.currencySymbol }} / h
          </span>
          <br />
          <span class="font-bold">
            {{ row.wage?.tokenRatePerHour  }} TOKEN / h
          </span>
          <br />
          <span class="font-bold">
            {{ row.wage?.usdcRatePerHour }} USDC / h
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
        <!-- Ajoute ici d'autres slots si besoin -->
      </TableComponent>
    </WeeklyClaimComponent>
  </CardComponent>
</template>

<script setup lang="ts">
import CardComponent from '@/components/CardComponent.vue'
import WeeklyClaimComponent from '@/components/WeeklyClaimComponent.vue'
import TableComponent, { type TableColumn } from '@/components/TableComponent.vue'
import UserComponent from '@/components/UserComponent.vue'
import { NETWORK } from '@/constant'
import { useCustomFetch } from '@/composables/useCustomFetch'
import { computed } from 'vue'

// 1. Récupère la liste des users de l'équipe (exemple avec useCustomFetch, adapte selon ton API)
const { data: teamUsersData } = useCustomFetch('/user/?teamId=1').get().json()

// 2. Fonction utilitaire pour retrouver un user par son address
function getUserByAddress(address: string) {
  return teamUsersData.value?.find((u: any) => u.address === address)
}

const { data, error } = useCustomFetch('/weeklyClaim/?teamId=1').get().json()

const isTeamClaimDataFetching = computed(() => !data.value && !error.value)

const flatClaims = computed(() => {
  if (!data.value) return []
  return data.value.flatMap((weeklyClaim: any) =>
    (weeklyClaim.claims || []).map((claim: any) => ({
      ...claim,
      weekStart: weeklyClaim.weekStart,
      memberAddress: weeklyClaim.memberAddress
    }))
  )
})

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