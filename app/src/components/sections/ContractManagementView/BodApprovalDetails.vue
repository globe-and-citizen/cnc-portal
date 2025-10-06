<template>
  <div class="grid grid-cols-2 gap-3 auto-rows-fr">
    <!-- First Card -->
    <BodApprovalDetailsCard :title="type === 'Ownership Transfer Request' ? 'Contract' : 'Amount'">
      <div
        class="font-semibold text-gray-700"
        :class="{ 'text-lg': type !== 'Ownership Transfer Request' }"
      >
        {{
          type === 'Ownership Transfer Request'
            ? row.description.split(' ')[3]
            : formatCryptoAmount(
                row.description.split(' ')[type === 'Pay Dividends Request' ? 3 : 1]
              )
        }}
        {{ type === 'Ownership Transfer Request' ? '' : NETWORK.currencySymbol }}
      </div>
      <div class="text-sm text-gray-500" v-if="type === 'Ownership Transfer Request'">
        {{ shortenAddress(teamStore.getContractAddressByType(row.description.split(' ')[3])) }}
      </div>
    </BodApprovalDetailsCard>

    <!-- Second Card -->
    <BodApprovalDetailsCard title="Recipient">
      <UserComponent
        :user="
          getUser(
            row.description.split(' ')[type === 'Bank Transfer Request' ? 4 : 5].trim(),
            teamStore.currentTeam?.members || [],
            '',
            teamStore.currentTeam?.teamContracts || []
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
import { shortenAddress } from '@/utils'

defineProps<{
  row: TableRow
  type: 'Bank Transfer Request' | 'Pay Dividends Request' | 'Ownership Transfer Request'
}>()
const teamStore = useTeamStore()
</script>
