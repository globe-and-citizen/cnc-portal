<template>
  <div class="space-y-4">
    <UAlert
      v-if="pausedCount"
      color="warning"
      variant="subtle"
      icon="i-lucide-triangle-alert"
      :title="`${pausedCount} ${pausedCount === 1 ? 'contract needs' : 'contracts need'} attention`"
      :description="`${pausedCount === 1 ? 'It is' : 'They are'} currently paused. Open the contract actions menu to resume operations.`"
    />

    <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 class="text-highlighted text-lg font-semibold">Current contract suite</h2>
        <p class="text-muted mt-1 text-sm">
          Operational state, balances and ownership for the contracts connected to this Officer.
        </p>
      </div>
      <div class="flex gap-2">
        <USelect
          v-model="statusFilter"
          :items="statusOptions"
          value-key="value"
          size="sm"
          aria-label="Filter contracts by status"
          class="min-w-32"
        />
        <USelect
          v-model="sortOrder"
          :items="sortOptions"
          value-key="value"
          size="sm"
          aria-label="Sort contracts"
          class="min-w-36"
        />
      </div>
    </div>

    <UCard :ui="{ body: 'p-0 sm:p-0' }">
      <UTable
        v-if="displayedContracts.length || isRefreshing"
        class="hidden md:block"
        :data="displayedContracts"
        :columns="columns"
        :loading="isRefreshing"
        :ui="{
          th: 'text-xs uppercase tracking-wide text-muted',
          td: 'py-4',
          tr: 'hover:bg-elevated/40 transition-colors'
        }"
      >
        <template #contract-cell="{ row: { original: contract } }">
          <div class="flex min-w-96 items-center gap-3">
            <div
              class="bg-primary/10 text-primary grid size-10 shrink-0 place-items-center rounded-xl"
            >
              <UIcon :name="presentation(contract.type).icon" class="size-5" />
            </div>
            <div class="min-w-0">
              <p class="text-highlighted font-medium">{{ presentation(contract.type).label }}</p>
              <AddressTooltip
                :address="contract.address"
                class="text-muted mt-1 font-mono text-xs whitespace-nowrap"
              />
            </div>
          </div>
        </template>

        <template #status-cell="{ row: { original: contract } }">
          <UBadge
            :color="contract.paused ? 'warning' : 'success'"
            variant="subtle"
            size="sm"
            class="gap-1.5"
          >
            <span
              class="size-1.5 rounded-full"
              :class="contract.paused ? 'bg-warning' : 'bg-success'"
            />
            {{ contract.paused ? 'Paused' : 'Active' }}
          </UBadge>
        </template>

        <template #balance-cell="{ row: { original: contract } }">
          <MainContractBalanceCell v-if="holdsValue(contract.type)" :address="contract.address" />
          <span v-else class="text-muted text-xs">No balance</span>
        </template>

        <template #owner-cell="{ row: { original: contract } }">
          <UserIdentity :user="getUser(contract.owner)" />
        </template>

        <template v-if="showActions" #actions-cell="{ row: { original: contract } }">
          <MainContractActions
            :row="contract"
            :version="version"
            @contract-status-changed="refresh"
          />
        </template>
      </UTable>

      <div v-if="displayedContracts.length" class="divide-default divide-y md:hidden">
        <article v-for="contract in displayedContracts" :key="contract.address" class="p-4">
          <div class="flex items-start justify-between gap-3">
            <div class="flex min-w-0 items-center gap-3">
              <div
                class="bg-primary/10 text-primary grid size-10 shrink-0 place-items-center rounded-xl"
              >
                <UIcon :name="presentation(contract.type).icon" class="size-5" />
              </div>
              <div class="min-w-0">
                <p class="text-highlighted font-medium">{{ presentation(contract.type).label }}</p>
                <AddressTooltip :address="contract.address" :slice="true" class="mt-1 text-xs" />
              </div>
            </div>
            <UBadge :color="contract.paused ? 'warning' : 'success'" variant="subtle" size="sm">
              {{ contract.paused ? 'Paused' : 'Active' }}
            </UBadge>
          </div>

          <dl class="mt-4 grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt class="text-muted">Balance</dt>
              <dd class="text-default mt-1">
                <MainContractBalanceCell
                  v-if="holdsValue(contract.type)"
                  :address="contract.address"
                />
                <span v-else>No balance</span>
              </dd>
            </div>
            <div>
              <dt class="text-muted">Owner</dt>
              <dd class="mt-1"><UserIdentity :user="getUser(contract.owner)" /></dd>
            </div>
          </dl>

          <div v-if="showActions" class="border-default mt-4 border-t pt-3">
            <MainContractActions
              :row="contract"
              :version="version"
              @contract-status-changed="refresh"
            />
          </div>
        </article>
      </div>

      <UEmpty
        v-if="!displayedContracts.length && !isRefreshing"
        variant="naked"
        icon="i-lucide-file-search"
        title="No contracts match this filter"
        description="Choose another status to see the full suite."
      />
    </UCard>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { Abi } from 'viem'
import AddressTooltip from '@/components/ui/AddressTooltip.vue'
import UserIdentity from '@/components/ui/UserIdentity.vue'
import { useTeamStore } from '@/stores'
import type { TeamContract, User } from '@/types'
import { getContractPresentation, getTeamContracts } from '@/utils'
import MainContractActions from './MainContractActions.vue'
import MainContractBalanceCell from './MainContractBalanceCell.vue'

interface EnrichedContract extends Omit<TeamContract, 'admins'> {
  admins?: string[]
  owner: string | null
  paused: boolean | null
  abi: Abi
}

const props = withDefaults(
  defineProps<{
    contracts: Array<{ address: string; type: string; deployer: string }>
    version: string | null
    showActions?: boolean
  }>(),
  { showActions: true }
)

const teamStore = useTeamStore()
const enrichedContracts = ref<EnrichedContract[]>([])
const isRefreshing = ref(false)
const statusFilter = ref<'all' | 'active' | 'paused'>('all')
const sortOrder = ref<'contract' | 'status'>('contract')
const showActions = computed(() => props.showActions)
const statusOptions = [
  { label: 'All statuses', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Paused', value: 'paused' }
]
const sortOptions = [
  { label: 'Sort: Contract', value: 'contract' },
  { label: 'Sort: Status', value: 'status' }
]
const columns = computed(() => [
  { accessorKey: 'contract', header: 'Contract' },
  { accessorKey: 'status', header: 'Status' },
  { accessorKey: 'balance', header: 'Balance' },
  { accessorKey: 'owner', header: 'Owner' },
  ...(showActions.value ? [{ accessorKey: 'actions', header: 'Pending / Actions' }] : [])
])

const displayedContracts = computed(() => {
  const filtered = enrichedContracts.value.filter((contract) => {
    if (statusFilter.value === 'paused') return contract.paused === true
    if (statusFilter.value === 'active') return contract.paused !== true
    return true
  })

  return [...filtered].sort((a, b) => {
    if (sortOrder.value === 'status') return Number(a.paused) - Number(b.paused)
    return presentation(a.type).label.localeCompare(presentation(b.type).label)
  })
})
const pausedCount = computed(
  () => enrichedContracts.value.filter((contract) => contract.paused === true).length
)

const VALUE_HOLDING_TYPES = new Set([
  'Bank',
  'ExpenseAccountEIP712',
  'CashRemunerationEIP712',
  'Safe'
])
const holdsValue = (type: string) => VALUE_HOLDING_TYPES.has(type)
const presentation = (type: string) => getContractPresentation(type)

const getUser = (address: string | null): User => {
  if (address && address === teamStore.getContractAddressByType('BoardOfDirectors')) {
    return { name: 'Board of Directors', address }
  }
  return (
    teamStore.currentTeam?.members.find((member) => member.address === address) || {
      name: 'Unknown',
      address: address || ''
    }
  )
}

async function refresh() {
  isRefreshing.value = true
  try {
    enrichedContracts.value =
      ((await getTeamContracts(props.contracts as TeamContract[])) as EnrichedContract[]) || []
  } finally {
    isRefreshing.value = false
  }
}

watch(() => props.contracts, refresh, { immediate: true })
</script>
