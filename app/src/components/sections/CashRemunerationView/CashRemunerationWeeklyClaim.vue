<template>
  <pre
    >{{ data }}
{{ error }}
</pre
  >
  <CardComponent title="Weekly Claim" class="w-full pb-7">
    <WeeklyClaimComponent>
      <TableComponent
        v-if="data"
        :rows="
          data.map((weeklyClaim) => {
            const hoursWorked = weeklyClaim.claims.reduce(
              (sum, claim) => sum + claim.hoursWorked,
              0
            )

            // a claim have a wage, creage a list of unique wage, with an attribute of claims: goupe claims by wage

            // const wages =
            return {
              ...weeklyClaim,
              hoursWorked: hoursWorked,
              wages: weeklyClaim.claims.reduce((acc, claim) => {
                
                if (!acc[claim.wage.id]) {
                  acc[claim.wage.id] = {
                    ...claim.wage,
                    claims: []
                  }
                }

                console.log("acc length", acc.length)
                console.log('claim wage id', claim.wage.id)
                acc[claim.wage.id].claims.push(claim)
                console.log('acc', acc)
                return acc
              }, [])
            }
          })
        "
        :columns="columns"
        :loading="isTeamClaimDataFetching"
      >
        <template #memberAddress-data="{ row }">
          <pre>
 
        {{ row.wages }}
        </pre
          >
          <UserComponent
            :user="{
              address: row.memberAddress,
              name: 'Unknown',
              imageUrl: ''
            }"
          />
        </template>

        <template #weekStart-data="{ row }">
          <span>{{ formatDate(row.weekStart) }}</span>
        </template>
        <!-- remplacer signature par hoursworked -->
        <template #hoursWorked-data="{ row }">
          <!-- <span class="font-bold"> 15:00 hrs </span>
          <br />
          <span> of 52 hrs weekly limit</span> -->
          <span class="font-bold"> {{ row.hoursWorked }}:00 hrs </span>
          <br />
          <span> of {{ row.wage?.maximumHoursPerWeek ?? '-' }} hrs weekly limit</span>
        </template>
        <!-- 
       
        
        <template #hourlyRate-data="{ row }">
          <span class="font-bold">
            {{ row.cashRatePerHour * row.hoursWorked }} {{ NETWORK.currencySymbol }}
          </span>
          <br />
          <span class="font-bold"> {{ row.tokenRatePerHour * row.hoursWorked }} TOKEN </span>
          <br />
          <span class="font-bold"> {{ row.usdcRatePerHour * row.hoursWorked }} USDC </span>
          <br />
          <span> {{ getHoulyRateInUserCurrency(row.usdcRatePerHour * row.hoursWorked) }} USD </span>
        </template> -->
        <!-- <template #status-data="{ row }">
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
        </template> -->
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
import { useCurrencyStore } from '@/stores'

// Récupère la liste des users de l'équipe
const { data: teamUsersData } = useCustomFetch('/user/?teamId=1').get().json()

function getUserByAddress(address: string) {
  return teamUsersData.value?.find((u: any) => u.address === address)
}

const { data, error } = useCustomFetch('/weeklyClaim/?teamId=1').get().json()

const isTeamClaimDataFetching = computed(() => !data.value && !error.value)

// const currencyStore = useCurrencyStore()
// const getHoulyRateInUserCurrency = (rate: number) => {
//   return (currencyStore.nativeTokenPrice ? rate * currencyStore.nativeTokenPrice : 0).toFixed(2)
// }

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
