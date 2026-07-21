<script setup lang="ts">
import { computed } from 'vue'
import type { Address } from 'viem'
import type { TeamContract } from '~/types'

const props = defineProps<{
  contracts: TeamContract[]
}>()

const rows = computed(() =>
  props.contracts.map((contract, index) => ({ ...contract, index: index + 1 }))
)

// Only these contract types actually custody funds — skip the on-chain balance
// reads for everything else (Officer, Voting, Elections, …).
const VALUE_HOLDING_TYPES = new Set([
  'Bank',
  'ExpenseAccountEIP712',
  'CashRemunerationEIP712',
  'Safe'
])
const holdsValue = (type: string) => VALUE_HOLDING_TYPES.has(type)
</script>

<template>
  <UTable
    :data="rows"
    :columns="[
      { accessorKey: 'index', header: '#' },
      { accessorKey: 'type', header: 'Type' },
      { accessorKey: 'address', header: 'Contract Address' },
      { accessorKey: 'deployer', header: 'Deployer' },
      { accessorKey: 'balance', header: 'Balance' },
      { accessorKey: 'logs', header: 'Logs' }
    ]"
  >
    <template #type-cell="{ row }">
      <UBadge color="neutral" variant="subtle">
        {{ row.original.type }}
      </UBadge>
    </template>

    <template #address-cell="{ row }">
      <AddressLink :address="row.original.address" label="Contract address copied" />
    </template>

    <template #deployer-cell="{ row }">
      <UserIdentity :address="row.original.deployer as Address" />
    </template>

    <template #balance-cell="{ row }">
      <ContractBalance
        v-if="holdsValue(row.original.type)"
        :address="row.original.address"
      />
      <span v-else class="text-sm text-dimmed">n/a</span>
    </template>

    <template #logs-cell="{ row }">
      <UModal :title="`Logs · ${row.original.type}`" :ui="{ content: 'max-w-4xl' }">
        <UButton
          size="xs"
          color="neutral"
          variant="ghost"
          icon="i-lucide-scroll-text"
          label="Logs"
        />
        <template #body>
          <ContractLogs :address="row.original.address" :type="row.original.type" />
        </template>
      </UModal>
    </template>
  </UTable>
</template>
