<template>
  <URadioGroup v-model="selectedRadio" :items="statuses" orientation="horizontal" />
  <div class="bg-base-100 w-full">
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
        <UserComponent
          :user="
            (row.user as any) || { name: row.userAddress, address: row.userAddress, imageUrl: '' }
          "
        ></UserComponent>
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
    </UTable>
  </div>
</template>

<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import { computed, ref, watch } from 'vue'
import { log, parseError, tokenSymbol } from '@/utils'
import { useUserDataStore, useTeamStore } from '@/stores'
import { keccak256 } from 'viem'
import { useReadContract, useWaitForTransactionReceipt, useWriteContract } from '@wagmi/vue'
import { EXPENSE_ACCOUNT_EIP712_ABI } from '@/artifacts/abi/expense-account-eip712'
import UserComponent from '@/components/UserComponent.vue'
import { useQueryClient } from '@tanstack/vue-query'
import { useGetExpensesQuery } from '@/queries'
import { getFrequencyType, getCustomFrequency } from '@/utils'

const teamStore = useTeamStore()
const toast = useToast()
const userDataStore = useUserDataStore()
const queryClient = useQueryClient()
const statuses = ['all', 'disabled', 'enabled', 'expired']
const selectedRadio = ref('all')
const signatureToUpdate = ref('')
const isLoadingSetStatus = ref(false)

const { data: expenseData, isLoading: isFetchingExpenseData } = useGetExpensesQuery({
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
] as TableColumn<any>[]

//#endregion Composables
const { data: contractOwnerAddress, error: errorGetOwner } = useReadContract({
  functionName: 'owner',
  address: expenseAccountEip712Address,
  abi: EXPENSE_ACCOUNT_EIP712_ABI
})
//deactivate approval
const {
  mutate: executeDeactivateApproval,
  error: errorDeactivateApproval,
  data: deactivateHash
} = useWriteContract()

const { isLoading: isConfirmingDeactivate, isSuccess: isConfirmedDeactivate } =
  useWaitForTransactionReceipt({
    hash: deactivateHash
  })

//activate approval
const {
  mutate: executeActivateApproval,
  error: errorActivateApproval,
  data: activateHash
} = useWriteContract()

const { isLoading: isConfirmingActivate, isSuccess: isConfirmedActivate } =
  useWaitForTransactionReceipt({
    hash: activateHash
  })
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
const deactivateApproval = async (signature: `0x{string}`) => {
  if (!expenseAccountEip712Address.value) {
    toast.add({ title: 'Failed to deactivate approval', color: 'error' })
    log.error('ExpenseAccountEip712Address is undefined')
    return
  }

  const signatureHash = keccak256(signature)

  executeDeactivateApproval({
    address: expenseAccountEip712Address.value,
    args: [signatureHash],
    abi: EXPENSE_ACCOUNT_EIP712_ABI,
    functionName: 'deactivateApproval'
  })
}

const activateApproval = async (signature: `0x{string}`) => {
  if (!expenseAccountEip712Address.value) {
    toast.add({ title: 'Failed to activate approval', color: 'error' })
    log.error('ExpenseAccountEip712Address is undefined')
    return
  }

  const signatureHash = keccak256(signature)

  executeActivateApproval({
    address: expenseAccountEip712Address.value,
    args: [signatureHash],
    abi: EXPENSE_ACCOUNT_EIP712_ABI,
    functionName: 'activateApproval'
  })
}

//#endregion

//#region Watch
watch(isConfirmingActivate, async (isConfirming, wasConfirming) => {
  if (!isConfirming && wasConfirming && isConfirmedActivate.value) {
    signatureToUpdate.value = ''
    isLoadingSetStatus.value = false
    queryClient.invalidateQueries({ queryKey: ['getExpenseData'] })
    toast.add({ title: 'Approval activated', color: 'success' })
  }
})
watch(isConfirmingDeactivate, async (isConfirming, wasConfirming) => {
  if (!isConfirming && wasConfirming && isConfirmedDeactivate.value) {
    signatureToUpdate.value = ''
    isLoadingSetStatus.value = false
    queryClient.invalidateQueries({ queryKey: ['getExpenseData'] })
    toast.add({ title: 'Approval deactivated', color: 'success' })
  }
})
watch(errorDeactivateApproval, (newVal) => {
  if (newVal) {
    isLoadingSetStatus.value = false
    log.error(parseError(newVal))
    toast.add({ title: 'Failed to deactivate approval', color: 'error' })
  }
})
watch(errorActivateApproval, (newVal) => {
  if (newVal) {
    isLoadingSetStatus.value = false
    log.error(parseError(newVal))
    toast.add({ title: 'Failed to activate approval', color: 'error' })
  }
})
watch(errorGetOwner, (newVal) => {
  if (newVal) {
    log.error(parseError(newVal))
    toast.add({ title: 'Could not fetch contract owner', color: 'error' })
  }
})
//#endregion
</script>
