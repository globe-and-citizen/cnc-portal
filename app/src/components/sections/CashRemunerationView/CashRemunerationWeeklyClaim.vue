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
              (sum: number, claim) => sum + claim.hoursWorked,
              0
            )

            // For each weeklyClaim, we want to group all claims by their wage.
            // We use a map (wagesMap) where the key is wage.id.
            // For each claim, if its wage is not yet in the map, we add it with a claims array.
            // Then we push the claim into the corresponding wage's claims array.
            // Finally, we extract all unique wages (with their grouped claims) as an array.
            // This gives us all unique wages for the week, each with the claims that used that wage.

            // @ts-ignore
            const wagesMap: Record<string, any> = {}
            weeklyClaim.claims.forEach((claim) => {
              if (!wagesMap[claim.wage.id]) {
                wagesMap[claim.wage.id] = {
                  ...claim.wage,
                  claims: []
                }
              }
              wagesMap[claim.wage.id].claims.push(claim)
            })
            const wages = Object.values(wagesMap)
            return {
              ...weeklyClaim,
              wages,
              hoursWorked: hoursWorked
            }
          })
        "
        :columns="columns"
        :loading="isTeamClaimDataFetching"
      >
        <template #memberAddress-data="{ row }">
          <!-- <pre>{{ row.wages }}</pre> -->

          <div v-for="wage of row.wages" :key="wage.id" class="border border-red-800 pb-2 mb-2">
            <div class="flex items-center justify-between">
              <span class="font-bold">{{ wage.name }}</span>
              <span class="text-gray-500"> {{ wage.tokenRatePerHour }} TOKEN / hr </span>
            </div>
            <div class="text-sm text-gray-600">
              {{ wage.description }}
            </div>
            <!-- {{ wage }} -->
          </div>
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
          <div v-for="wage of row.wages" :key="wage.id">
            <span class="font-bold">
              {{ wage.claims.reduce((sum: number, claim) => sum + claim.hoursWorked, 0) }}:00 hrs
            </span>
            <br />
            <span> of {{ wage.maximumHoursPerWeek ?? '-' }} hrs weekly limit</span>
          </div>
        </template>

        <template #hourlyRate-data="{ row }">
          <div v-for="wage of row.wages" :key="wage.id">
            <!-- {{ wage }} -->
            <span class="font-bold"> {{ wage.cashRatePerHour }} {{ NETWORK.currencySymbol }} </span>
            <br />
            <span class="font-bold"> {{ wage.tokenRatePerHour }} TOKEN </span>
            <br />
            <span class="font-bold"> {{ wage.usdcRatePerHour }} USDC </span>
            <br />
            <!-- <span> {{ getHoulyRateInUserCurrency(row.usdcRatePerHour * row.hoursWorked) }} USD </span> -->
          </div>
        </template>
        <template #totalAmount-data="{ row }">
          <div v-for="wage of row.wages" :key="wage.id">
            <span class="font-bold">
              {{
                wage.cashRatePerHour *
                wage.claims.reduce((sum: number, claim) => sum + claim.hoursWorked, 0)
              }}
              {{ NETWORK.currencySymbol }}
            </span>
            <br />
            <span class="font-bold">
              {{
                wage.tokenRatePerHour *
                wage.claims.reduce((sum: number, claim) => sum + claim.hoursWorked, 0)
              }}
              TOKEN
            </span>
            <br />
            <span class="font-bold">
              {{
                wage.usdcRatePerHour *
                wage.claims.reduce((sum: number, claim) => sum + claim.hoursWorked, 0)
              }}
              USDC
            </span>
            <br />
            <!-- <span> {{ getHoulyRateInUserCurrency(row.usdcRatePerHour * row.hoursWorked) }} USD </span> -->
          </div>
        </template>
        <!-- 
       
        -->
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
