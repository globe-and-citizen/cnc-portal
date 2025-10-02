<template>
  <div class="grid grid-cols-2 gap-3 auto-rows-fr">
    <!-- First Card -->
    <BodApprovalDetailsCard title="Amount">
      <p class="text-lg font-semibold text-gray-700">
        {{
          formatCryptoAmount(row.description.split(' ')[type === 'Pay Dividends Request' ? 3 : 1])
        }}
        {{ NETWORK.currencySymbol }}
      </p>
    </BodApprovalDetailsCard>

    <!-- Second Card -->
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

    <!-- Third Card -->
    <BodApprovalDetailsCard title="Requestor">
      <UserComponent :user="row.requestedBy" />
    </BodApprovalDetailsCard>

    <!-- Fourth Card -->
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
