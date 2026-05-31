<template>
  <URadioGroup v-model="selectedRadio" :items="statuses" orientation="horizontal" />
  <div class="bg-default w-full">
    <UTable :data="filteredApprovals" :columns="columns" :loading="isFetchingExpenseData">
      <template #action-cell="{ row: { original: row } }">
        <UButton
          v-if="row.status == 'enabled'"
          color="error"
          data-test="disable-button"
          size="sm"
          :loading="isLoadingSetStatus && signatureToUpdate === row.signature"
          :disabled="!(contractOwnerAddress === userDataStore.address)"
          @click="
            () => {
              isLoadingSetStatus = true
              signatureToUpdate = row.signature
              deactivateApproval(row.signature as `0x{string}`)
            }
          "
          label="Disable"
        />
        <UButton
          v-if="row.status == 'disabled'"
          color="info"
          data-test="enable-button"
          size="sm"
          :loading="isLoadingSetStatus && signatureToUpdate === row.signature"
          :disabled="!(contractOwnerAddress === userDataStore.address)"
          @click="
            () => {
              isLoadingSetStatus = true
              signatureToUpdate = row.signature
              activateApproval(row.signature as `0x{string}`)
            }
          "
          label="Enable"
        />
      </template>
      <template #member-cell="{ row: { original: row } }">
        <UserComponent :user="resolveUser(row.userAddress)"></UserComponent>
      </template>
      <template #startDate-cell="{ row: { original: row } }">
        <span>{{ new Date(Number(row.startDate) * 1000).toLocaleString('en-US') }}</span>
      </template>
      <template #endDate-cell="{ row: { original: row } }">
        <span>{{ new Date(Number(row.endDate) * 1000).toLocaleString('en-US') }}</span>
      </template>
      <template #status-cell="{ row: { original: row } }">
        <UBadge
          :label="row.status"
          :icon="statusIcon(row.status)"
          variant="outline"
          class="rounded-full"
          :color="
            row.status === 'enabled' ? 'success' : row.status === 'disabled' ? 'info' : 'error'
          "
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
        <span>{{ row.balances[1] }}/{{ row.amount }} {{ tokenSymbol(row.tokenAddress) }}</span>
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
import { log, parseError, tokenSymbol, resolveUser } from '@/utils'
import { useUserDataStore, useTeamStore } from '@/stores'
import { keccak256 } from 'viem'
import { useReadContract } from '@wagmi/vue'
import { EXPENSE_ACCOUNT_EIP712_ABI } from '@/artifacts/abi/expense-account-eip712'
import {
  useExpenseAccountActivateApproval,
  useExpenseAccountDeactivateApproval
} from '@/composables/expenseAccount/writes'
import UserComponent from '@/components/UserComponent.vue'
import { useQueryClient } from '@tanstack/vue-query'
import { useGetExpensesQuery, expenseKeys } from '@/queries'
import { getFrequencyType, getCustomFrequency } from '@/utils'

const teamStore = useTeamStore()
const toast = useToast()
const userDataStore = useUserDataStore()
const queryClient = useQueryClient()
const statuses = ['all', 'disabled', 'enabled', 'expired']
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

const formattedExpenseData = computed(() => {
  return expenseData.value?.map((expense) => {
    return {
      ...expense.data,
      ...expense
    }
  })
})

const expenseAccountEip712Address = computed(() =>
  teamStore.getContractAddressByType('ExpenseAccountEIP712')
)

// Pairs each status with an icon so it is not conveyed by color alone.
const statusIcon = (status: string): string => {
  if (status === 'enabled') return 'i-lucide-circle-check'
  if (status === 'disabled') return 'i-lucide-circle-x'
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
  abi: EXPENSE_ACCOUNT_EIP712_ABI
})

const { mutate: executeDeactivateApproval } = useExpenseAccountDeactivateApproval()
const { mutate: executeActivateApproval } = useExpenseAccountActivateApproval()
//#region

const filteredApprovals = computed(() => {
  if (selectedRadio.value === 'all') {
    return formattedExpenseData.value
  } else {
    return (formattedExpenseData.value ?? []).filter(
      (approval) => approval.status === selectedRadio.value
    )
  }
})

//#region Functions
const deactivateApproval = (signature: `0x{string}`) => {
  if (!expenseAccountEip712Address.value) {
    toast.add({ title: 'Failed to deactivate approval', color: 'error' })
    log.error('ExpenseAccountEip712Address is undefined')
    return
  }

  executeDeactivateApproval(
    { args: [keccak256(signature)] },
    {
      onSuccess: () => {
        signatureToUpdate.value = ''
        isLoadingSetStatus.value = false
        queryClient.invalidateQueries({ queryKey: expenseKeys.list(teamStore.currentTeamId) })
        toast.add({ title: 'Approval deactivated', color: 'success' })
      },
      onError: (err) => {
        isLoadingSetStatus.value = false
        log.error(parseError(err))
        toast.add({ title: 'Failed to deactivate approval', color: 'error' })
      }
    }
  )
}

const activateApproval = (signature: `0x{string}`) => {
  if (!expenseAccountEip712Address.value) {
    toast.add({ title: 'Failed to activate approval', color: 'error' })
    log.error('ExpenseAccountEip712Address is undefined')
    return
  }

  executeActivateApproval(
    { args: [keccak256(signature)] },
    {
      onSuccess: () => {
        signatureToUpdate.value = ''
        isLoadingSetStatus.value = false
        queryClient.invalidateQueries({ queryKey: expenseKeys.list(teamStore.currentTeamId) })
        toast.add({ title: 'Approval activated', color: 'success' })
      },
      onError: (err) => {
        isLoadingSetStatus.value = false
        log.error(parseError(err))
        toast.add({ title: 'Failed to activate approval', color: 'error' })
      }
    }
  )
}

//#endregion

//#region Watch
watch(errorGetOwner, (newVal) => {
  if (newVal) {
    log.error(parseError(newVal))
    toast.add({ title: 'Could not fetch contract owner', color: 'error' })
  }
})
//#endregion
</script>
