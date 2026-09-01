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
      <MainContractDesktopTable
        :rows="displayedContractRows"
        :is-refreshing="isRefreshing"
        :show-actions="showActions"
        @view-details="openContractAction($event, 'details')"
        @copy-contract-address="copyContractAddress"
        @open-in-explorer="openContractInExplorer"
        @review-pending-actions="openContractAction($event, 'approval')"
        @transfer-ownership="openContractAction($event, 'transfer')"
        @change-status="requestStatusChange"
      />

      <div v-if="displayedContracts.length" class="divide-default divide-y md:hidden">
        <MainContractMobileCard
          v-for="row in displayedContractRows"
          :key="row.contract.address"
          :row="row"
          @view-details="openContractAction($event, 'details')"
          @copy-contract-address="copyContractAddress"
          @open-in-explorer="openContractInExplorer"
          @review-pending-actions="openContractAction($event, 'approval')"
          @transfer-ownership="openContractAction($event, 'transfer')"
          @change-status="requestStatusChange"
        />
      </div>

      <MainContractActions
        v-if="showActions"
        :row="selectedContract"
        :version="version"
        :pending-actions="selectedPendingActions"
        :is-bod-action="selectedIsBodAction"
        :open="selectedActionSurface"
        :status-change-request="statusChangeRequest"
        @update:open="selectedActionSurface = $event"
        @contract-status-changed="refresh"
      />

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
import { useClipboard } from '@vueuse/core'
import type { Abi, Address } from 'viem'
import { NETWORK } from '@/constant'
import { useBodIsMember } from '@/composables/bod/reads'
import { useTeamWriteGuard } from '@/composables/useTeamWriteGuard'
import { useGetBodActionsQuery } from '@/queries'
import { useTeamStore, useUserDataStore } from '@/stores'
import type { TeamContract, User } from '@/types'
import type { TableRow } from '@/types/table'
import type { FormattedAction } from '@/utils/contracts/management'
import { filterAndFormatActions } from '@/utils/contracts/management'
import { getTeamContracts } from '@/composables/contracts/readTeamContracts'
import { getContractPresentation } from '@/utils/contracts/presentation'
import MainContractActions from './MainContractActions.vue'
import MainContractDesktopTable from './MainContractDesktopTable.vue'
import MainContractMobileCard from './MainContractMobileCard.vue'
import type { ContractActionState, ContractTableRow } from './MainContractTable.types'

interface EnrichedContract extends Omit<TeamContract, 'admins'> {
  admins?: string[]
  owner: string | null
  paused: boolean | null
  abi: Abi
}

type ContractActionSurface = 'details' | 'transfer' | 'approval' | null

interface ContractStatusChangeRequest {
  id: number
  paused: boolean
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
const userDataStore = useUserDataStore()
const toast = useToast()
const { copy } = useClipboard()
const { isWriteDisabled } = useTeamWriteGuard()
const enrichedContracts = ref<EnrichedContract[]>([])
const isRefreshing = ref(false)
const statusFilter = ref<'all' | 'active' | 'paused'>('all')
const sortOrder = ref<'contract' | 'status'>('contract')
const selectedContract = ref<EnrichedContract | null>(null)
const selectedActionSurface = ref<ContractActionSurface>(null)
const statusChangeRequest = ref<ContractStatusChangeRequest | null>(null)
const nextStatusChangeRequestId = ref(0)
const showActions = computed(() => props.showActions)
const bodMemberAddress = computed<Address>(
  () => (showActions.value ? userDataStore.address : '') as Address
)
const { data: isCurrentUserBodMember } = useBodIsMember(bodMemberAddress)
const { data: bodActions } = useGetBodActionsQuery({
  queryParams: {
    teamId: computed(() => (showActions.value ? teamStore.currentTeamId : null)),
    isExecuted: false
  }
})
const statusOptions = [
  { label: 'All statuses', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Paused', value: 'paused' }
]
const sortOptions = [
  { label: 'Sort: Contract', value: 'contract' },
  { label: 'Sort: Status', value: 'status' }
]
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
const pendingActionsByContract = computed(
  () =>
    new Map<string, FormattedAction>(
      enrichedContracts.value.map((contract) => [
        contract.address,
        filterAndFormatActions(
          contract.address,
          bodActions.value,
          teamStore.currentTeam?.members || []
        )
      ])
    )
)
const selectedPendingActions = computed(() =>
  selectedContract.value ? pendingActionsFor(selectedContract.value) : []
)
const selectedIsBodAction = computed(() =>
  selectedContract.value ? isBodAction(selectedContract.value) : false
)

const VALUE_HOLDING_TYPES = new Set([
  'Bank',
  'ExpenseAccountEIP712',
  'CashRemunerationEIP712',
  'Safe'
])
const holdsValue = (type: string) => VALUE_HOLDING_TYPES.has(type)
const presentation = (type: string) => getContractPresentation(type)
const pendingActionsFor = (contract: EnrichedContract): FormattedAction =>
  pendingActionsByContract.value.get(contract.address) ?? []
const isBodAction = (contract: EnrichedContract) =>
  contract.owner === teamStore.getContractAddressByType('BoardOfDirectors') &&
  isCurrentUserBodMember.value === true
const canManage = (contract: EnrichedContract) =>
  !isWriteDisabled.value && (contract.owner === userDataStore.address || isBodAction(contract))
const canReviewPendingActions = (contract: EnrichedContract) =>
  !isWriteDisabled.value && isBodAction(contract) && pendingActionsFor(contract).length > 0
const actionStateFor = (contract: EnrichedContract): ContractActionState | undefined =>
  showActions.value
    ? {
        pendingActionCount: pendingActionsFor(contract).length,
        canManage: canManage(contract),
        canReviewPendingActions: canReviewPendingActions(contract)
      }
    : undefined

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

const displayedContractRows = computed<ContractTableRow[]>(() =>
  displayedContracts.value.map((contract) => ({
    contract,
    owner: getUser(contract.owner),
    holdsValue: holdsValue(contract.type),
    actionState: actionStateFor(contract)
  }))
)

async function refresh() {
  isRefreshing.value = true
  try {
    enrichedContracts.value =
      ((await getTeamContracts(props.contracts as TeamContract[])) as EnrichedContract[]) || []
  } finally {
    isRefreshing.value = false
  }
}

function openContractAction(contract: TableRow, surface: ContractActionSurface) {
  selectedContract.value = contract as EnrichedContract
  selectedActionSurface.value = surface
}

function requestStatusChange(contract: TableRow, paused: boolean) {
  selectedContract.value = contract as EnrichedContract
  selectedActionSurface.value = null
  nextStatusChangeRequestId.value += 1
  statusChangeRequest.value = {
    id: nextStatusChangeRequestId.value,
    paused
  }
}

function copyContractAddress(address: string) {
  void copy(address)
  toast.add({ title: 'Contract address copied', color: 'success', icon: 'i-lucide-check' })
}

function openContractInExplorer(address: string) {
  window.open(`${NETWORK.blockExplorerUrl}/address/${address}`, '_blank')
}

watch(() => props.contracts, refresh, { immediate: true })
</script>
