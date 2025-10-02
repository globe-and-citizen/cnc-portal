<template>
  <!-- Details cards grid -->
  <div class="grid grid-cols-2 gap-3 auto-rows-fr">
    <!-- Amount Card -->
    <!-- <div class="flex flex-col">
      <p class="text-sm font-medium text-blue-gray-700 mb-1">Amount</p>
      <div class="rounded-lg border border-blue-gray-200 bg-gray-50 p-3 flex-1">
        <p class="text-lg font-semibold text-gray-700">
          {{
            formatCryptoAmount(row.description.split(' ')[type === 'Pay Dividends Request' ? 3 : 1])
          }}
          {{ NETWORK.currencySymbol }}
        </p>
      </div>
    </div> -->
    <BodApprovalDetailsCard title="Amount">
      <p class="text-lg font-semibold text-gray-700">
        {{
          formatCryptoAmount(row.description.split(' ')[type === 'Pay Dividends Request' ? 3 : 1])
        }}
        {{ NETWORK.currencySymbol }}
      </p>
    </BodApprovalDetailsCard>

    <!-- Recipient Card -->
    <!-- <div class="flex flex-col">
      <p class="text-sm font-medium text-blue-gray-700 mb-1">Recipient</p>
      <div class="rounded-lg border border-blue-gray-200 bg-gray-50 p-3 flex-1">
        <UserComponent
          :user="
            getUser(
              row.description.split(' ')[type === 'Pay Dividends Request' ? 5 : 4].trim(),
              teamStore.currentTeam?.members || []
            )
          "
        />
      </div>
    </div> -->
    <BodApprovalDetailsCard title="Recipient">
      <UserComponent
        :user="
          getUser(
            row.description.split(' ')[type === 'Pay Dividends Request' ? 5 : 4].trim(),
            teamStore.currentTeam?.members || []
          )
        "
      />
    </BodApprovalDetailsCard>

    <!-- Requestor Card -->
    <!-- <div class="flex flex-col">
      <p class="text-sm font-medium text-blue-gray-700 mb-1">Requestor</p>
      <div class="rounded-lg border border-blue-gray-200 bg-gray-50 p-3 flex-1">
        <UserComponent :user="row.requestedBy" />
      </div>
    </div> -->
    <BodApprovalDetailsCard title="Requestor">
      <UserComponent :user="row.requestedBy" />
    </BodApprovalDetailsCard>

    <!-- Request Date Card -->
    <!-- <div class="flex flex-col">
      <p class="text-sm font-medium text-blue-gray-700 mb-1">Request Date</p>
      <div class="rounded-lg border border-blue-gray-200 bg-gray-50 p-3 flex-1">
        <p class="text-lg font-semibold text-gray-600">{{ row.dateCreated }}</p>
      </div>
    </div> -->
    <BodApprovalDetailsCard title="Request Date">
      <p class="text-lg font-semibold text-gray-600">{{ row.dateCreated }}</p>
    </BodApprovalDetailsCard>
  </div>
</template>
<script setup lang="ts">
import UserComponent from '@/components/UserComponent.vue'
import { useTeamStore } from '@/stores'
import type { TableRow } from '@/components/TableComponent.vue'
import { getUser, formatCryptoAmount } from '@/utils'
import { NETWORK } from '@/constant'
import BodApprovalDetailsCard from './BodApprovalDetailsCard.vue'

defineProps<{ row: TableRow; type: 'Bank Transfer Request' | 'Pay Dividends Request' }>()
const teamStore = useTeamStore()
</script>
