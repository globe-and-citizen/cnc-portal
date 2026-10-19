<template>
  <PreviousApprovalNotice :team-id="teamStore.currentTeamId" :approvals="formattedExpenseData" />
  <URadioGroup v-model="selectedRadio" :items="statuses" orientation="horizontal" />
  <div class="bg-default w-full">
    <UTable :data="filteredApprovals" :columns="columns" :loading="isFetchingExpenseData">
      <template #action-cell="{ row: { original: row } }">
        <span
          v-if="row.sourceGeneration === 'previous' && row.sourceEnforcesDisabled === false"
          data-test="legacy-disable-unsupported"
          >Disable is not enforced by this version. Move funds to retire it.</span
        >
        <UTooltip :text="archivedTooltip">
          <UButton
            v-if="row.status == 'enabled' && row.sourceEnforcesDisabled !== false"
            color="error"
            data-test="disable-button"
            size="sm"
            :loading="isLoadingSetStatus && signatureToUpdate === row.signature"
            :disabled="
              isWriteDisabled ||
              (row.sourceGeneration !== 'previous' &&
                !(contractOwnerAddress === userDataStore.address))
            "
            @click="
              () => {
                isLoadingSetStatus = true
                signatureToUpdate = row.signature
                deactivateApproval(row)
              }
            "
            label="Disable"
          />
        </UTooltip>
        <UTooltip :text="archivedTooltip">
          <UButton
            v-if="row.status == 'disabled'"
            color="info"
            data-test="enable-button"
            size="sm"
            :loading="isLoadingSetStatus && signatureToUpdate === row.signature"
            :disabled="
              isWriteDisabled ||
              (row.sourceGeneration !== 'previous' &&
                !(contractOwnerAddress === userDataStore.address))
            "
            @click="
              () => {
                isLoadingSetStatus = true
                signatureToUpdate = row.signature
                activateApproval(row)
              }
            "
            label="Enable"
          />
        </UTooltip>
      </template>
      <template #member-cell="{ row: { original: row } }">
        <UserIdentity :user="resolveUser(row.userAddress)"></UserIdentity>
      </template>
      <template #startDate-cell="{ row: { original: row } }">
        <span>{{ formatDateTime(fromUnix(row.startDate)) }}</span>
      </template>
      <template #endDate-cell="{ row: { original: row } }">
        <span>{{ formatDateTime(fromUnix(row.endDate)) }}</span>
      </template>
      <template #status-cell="{ row: { original: row } }">
        <UBadge
          :label="row.status"
          :icon="statusIcon(row.status)"
          variant="outline"
          class="rounded-full"
          :color="
            row.status === 'enabled'
              ? 'success'
              : row.status === 'disabled'
                ? 'info'
                : row.status === 'historical' || row.status === 'unavailable'
                  ? 'neutral'
                  : 'error'
          "
        />
        <UBadge
          v-if="row.sourceGeneration === 'previous'"
          label="Previous version"
          color="warning"
          variant="soft"
          class="ml-2"
          data-test="previous-version-badge"
        />
        <UBadge
          v-if="row.sourceGeneration === 'previous' && row.sourceEnforcesDisabled === false"
          label="Disable unsupported"
          color="error"
          variant="soft"
          class="ml-2"
        />
      </template>
      <template #frequencyType-cell="{ row: { original: row } }">
        <span>{{
          row.frequencyType == 4
            ? getCustomFrequency(Number(row.customFrequency))
            : getFrequencyType(row.frequencyType)
        }}</span>
      </template>
      <template #amountTransferred-cell="{ row: { original: row } }">
        <span
          >{{ row.balances?.[1] ?? '—' }}/{{ row.amount }} {{ tokenSymbol(row.tokenAddress) }}</span
        >
      </template>
      <template #empty>
        <div
          v-if="errorFetchingExpenseData"
          class="text-error py-6 text-center text-sm"
          data-test="approvals-error"
        >
          Failed to load spending approvals.
        </div>
        <div v-else class="py-6 text-center text-sm text-gray-500" data-test="approvals-empty">
          {{
            selectedRadio === 'all'
              ? 'No spending approvals yet.'
              : `No ${selectedRadio} approvals.`
          }}
        </div>
      </template>
    </UTable>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { log } from '@/lib/logging'
import { tokenSymbol } from '@/utils/tokens/metadata'
import { useTransactionPresentation } from '@/composables/transactions/useTransactionPresentation'
import { useUserDataStore, useTeamStore } from '@/stores'
import { isAddress, keccak256, type Address } from 'viem'
import { useReadContract } from '@wagmi/vue'
import { isExpenseApprovalOwner } from '@/composables/expenseAccount/approvalOwner'
import { expenseAccountEip712Abi } from '@/artifacts/abi/generated'
import {
  useExpenseAccountActivateApproval,
  useExpenseAccountDeactivateApproval
} from '@/composables/expenseAccount/writes'
import UserIdentity from '@/components/ui/UserIdentity.vue'
import { useQueryClient } from '@tanstack/vue-query'
import { useGetExpensesQuery, expenseKeys } from '@/queries'
import { getFrequencyType, getCustomFrequency } from '@/utils/expenses/model'
import { useTeamWriteGuard } from '@/composables/useTeamWriteGuard'
import { formatDateTime, fromUnix } from '@/utils/format'
import PreviousApprovalNotice from './PreviousApprovalNotice.vue'

const teamStore = useTeamStore()
const { resolveUser } = useTransactionPresentation()
const { isWriteDisabled, archivedTooltip } = useTeamWriteGuard()
const toast = useToast()
const userDataStore = useUserDataStore()
const queryClient = useQueryClient()
const statuses = ['all', 'disabled', 'enabled', 'expired', 'limit-reached', 'unavailable']
const selectedRadio = ref('all')
const signatureToUpdate = ref('')
const isLoadingSetStatus = ref(false)

const {
  data: expenseData,
  isLoading: isFetchingExpenseData,
  error: errorFetchingExpenseData
} = useGetExpensesQuery({
  queryParams: { teamId: computed(() => teamStore.currentTeamId) }
})

const formattedExpenseData = computed(() =>
  expenseData.value?.map((expense) => ({ ...expense.data, ...expense }))
)
const expenseAccountEip712Address = computed(() =>
  teamStore.getContractAddressByType('ExpenseAccountEIP712')
)

const statusIcon = (status: string): string => {
  if (status === 'enabled') return 'i-lucide-circle-check'
  if (status === 'disabled') return 'i-lucide-circle-x'
  if (status === 'unavailable') return 'i-lucide-circle-alert'
  return 'i-lucide-clock'
}
const columns = [
  {
    accessorKey: 'member',
    header: 'Member',
    enableSorting: false
  },
  {
    accessorKey: 'startDate',
    header: 'Start Date',
    enableSorting: true
  },
  {
    accessorKey: 'endDate',
    header: 'End Date',
    enableSorting: true
  },
  {
    accessorKey: 'frequencyType',
    header: 'Frequency',
    enableSorting: false
  },
  {
    accessorKey: 'amountTransferred',
    header: 'Max Amount',
    enableSorting: false
  },
  {
    accessorKey: 'status',
    header: 'Status'
  },
  {
    accessorKey: 'action',
    header: 'Action',
    enableSorting: false
  }
]

//#endregion Composables
const { data: contractOwnerAddress, error: errorGetOwner } = useReadContract({
  functionName: 'owner',
  address: expenseAccountEip712Address,
  abi: expenseAccountEip712Abi
})

const actionSourceAddress = computed(() => {
  const row = formattedExpenseData.value?.find((item) => item.signature === signatureToUpdate.value)
  const address = row?.data?.signedAgainstContractAddress ?? row?.signedAgainstContractAddress
  if (typeof address === 'string' && isAddress(address)) return address as Address
  return row?.sourceGeneration === 'previous'
    ? undefined
    : (expenseAccountEip712Address.value as Address | undefined)
})
const { mutate: executeDeactivateApproval } =
  useExpenseAccountDeactivateApproval(actionSourceAddress)
const { mutate: executeActivateApproval } = useExpenseAccountActivateApproval(actionSourceAddress)
//#region

const filteredApprovals = computed(() =>
  selectedRadio.value === 'all'
    ? formattedExpenseData.value
    : formattedExpenseData.value?.filter((approval) => approval.status === selectedRadio.value)
)

//#region Functions
const verifyPreviousOwner = async (row: NonNullable<typeof formattedExpenseData.value>[number]) => {
  if (row.sourceGeneration !== 'previous') return true
  const address = row.data.signedAgainstContractAddress
  if (!address || !isAddress(address)) return false
  return isExpenseApprovalOwner(address, userDataStore.address)
}

const deactivateApproval = async (row: NonNullable<typeof formattedExpenseData.value>[number]) => {
  if (!actionSourceAddress.value || !(await verifyPreviousOwner(row))) {
    isLoadingSetStatus.value = false
    log.error('Expense approval source is unavailable or wallet does not own it')
    toast.add({ title: 'Failed to deactivate approval', color: 'error' })
    return
  }

  executeDeactivateApproval(
    { args: [keccak256(row.signature as `0x${string}`)] },
    {
      onSuccess: () => {
        signatureToUpdate.value = ''
        isLoadingSetStatus.value = false
        queryClient.invalidateQueries({ queryKey: expenseKeys.list(teamStore.currentTeamId) })
        toast.add({ title: 'Approval deactivated', color: 'success' })
      },
      onError: (err) => {
        isLoadingSetStatus.value = false
        log.error('Failed to deactivate approval:', err)
        toast.add({ title: 'Failed to deactivate approval', color: 'error' })
      }
    }
  )
}

const activateApproval = async (row: NonNullable<typeof formattedExpenseData.value>[number]) => {
  if (!actionSourceAddress.value || !(await verifyPreviousOwner(row))) {
    isLoadingSetStatus.value = false
    log.error('Expense approval source is unavailable or wallet does not own it')
    toast.add({ title: 'Failed to activate approval', color: 'error' })
    return
  }

  executeActivateApproval(
    { args: [keccak256(row.signature as `0x${string}`)] },
    {
      onSuccess: () => {
        signatureToUpdate.value = ''
        isLoadingSetStatus.value = false
        queryClient.invalidateQueries({ queryKey: expenseKeys.list(teamStore.currentTeamId) })
        toast.add({ title: 'Approval activated', color: 'success' })
      },
      onError: (err) => {
        isLoadingSetStatus.value = false
        log.error('Failed to activate approval:', err)
        toast.add({ title: 'Failed to activate approval', color: 'error' })
      }
    }
  )
}

//#endregion

//#region Watch
watch(errorGetOwner, (newVal) => {
  if (newVal) {
    log.error('Could not fetch contract owner:', newVal)
    toast.add({ title: 'Could not fetch contract owner', color: 'error' })
  }
})
//#endregion
</script>
