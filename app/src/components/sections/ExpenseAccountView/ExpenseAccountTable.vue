<template>
  <div class="form-control flex flex-row gap-1">
    <label class="label cursor-pointer flex gap-2" :key="status" v-for="status in statuses">
      <span class="label-text">{{ status.charAt(0).toUpperCase() + status.slice(1) }}</span>
      <input
        type="radio"
        name="pending"
        class="radio checked:bg-primary"
        :data-test="`status-input-${status}`"
        :id="status"
        :value="status"
        v-model="selectedRadio"
      />
    </label>
  </div>
  <div class="card bg-base-100 w-full">
    <TableComponent :rows="filteredApprovals" :columns="columns" :loading="isFetchingExpenseData">
      <template #action-data="{ row }">
        <ButtonUI
          v-if="row.status == 'enabled'"
          variant="error"
          data-test="disable-button"
          size="sm"
          :loading="isLoadingSetStatus && signatureToUpdate === row.signature"
          :disabled="!(contractOwnerAddress === userDataStore.address)"
          @click="
            () => {
              isLoadingSetStatus = true
              signatureToUpdate = row.signature
              deactivateApproval(row.signature)
            }
          "
          >Disable</ButtonUI
        >
        <ButtonUI
          v-if="row.status == 'disabled'"
          variant="info"
          data-test="enable-button"
          size="sm"
          :loading="isLoadingSetStatus && signatureToUpdate === row.signature"
          :disabled="!(contractOwnerAddress === userDataStore.address)"
          @click="
            () => {
              isLoadingSetStatus = true
              signatureToUpdate = row.signature
              activateApproval(row.signature)
            }
          "
          >Enable</ButtonUI
        >
      </template>
      <template #member-data="{ row }">
        <UserComponent v-if="!!row.user" :user="row.user"></UserComponent>
      </template>
      <template #startDate-data="{ row }">
        <span>{{ new Date(Number(row.startDate) * 1000).toLocaleString('en-US') }}</span>
      </template>
      <template #endDate-data="{ row }">
        <span>{{ new Date(Number(row.endDate) * 1000).toLocaleString('en-US') }}</span>
      </template>
      <template #status-data="{ row }">
        <span
          class="badge"
          :class="{
            'badge-success badge-outline': row.status === 'enabled',
            'badge-info badge-outline': row.status === 'disabled',
            'badge-error badge-outline': row.status === 'expired'
          }"
          >{{ row.status }}</span
        >
      </template>
      <template #frequencyType-data="{ row }">
        <span>{{
          row.frequencyType == 4
            ? getCustomFrequency(row.customFrequency)
            : getFrequencyType(row.frequencyType)
        }}</span>
      </template>
      <template #amountTransferred-data="{ row }">
        <span>{{ row.balances[1] }}/{{ row.amount }} {{ tokenSymbol(row.tokenAddress) }}</span>
      </template>
    </TableComponent>
  </div>
</template>

<script setup lang="ts">
import ButtonUI from '@/components/ButtonUI.vue'
import TableComponent, { type TableColumn } from '@/components/TableComponent.vue'
import { computed, ref, watch } from 'vue'
import { log, parseError, tokenSymbol } from '@/utils'
import { useToastStore, useUserDataStore, useTeamStore } from '@/stores'
import { keccak256 } from 'viem'
import { useReadContract, useWaitForTransactionReceipt, useWriteContract } from '@wagmi/vue'
import { EXPENSE_ACCOUNT_EIP712_ABI } from '@/artifacts/abi/expense-account-eip712'
import UserComponent from '@/components/UserComponent.vue'
import { useQueryClient } from '@tanstack/vue-query'
import { useExpensesQuery } from '@/queries'
import type { ExpenseResponse } from '@/types'
import { getFrequencyType, getCustomFrequency } from '@/utils'

const teamStore = useTeamStore()
const { addErrorToast, addSuccessToast } = useToastStore()
const userDataStore = useUserDataStore()
const queryClient = useQueryClient()
const statuses = ['all', 'disabled', 'enabled', 'expired']
const selectedRadio = ref('all')
const signatureToUpdate = ref('')
const isLoadingSetStatus = ref(false)

const {
  data: expenseData,
  isLoading: isFetchingExpenseData
  // error: errorFetchingExpenseData
} = useExpensesQuery(() => teamStore.currentTeamId)

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
    key: 'member',
    label: 'Member',
    sortable: false
  },
  {
    key: 'startDate',
    label: 'Start Date',
    sortable: true
  },
  {
    key: 'endDate',
    label: 'End Date',
    sortable: true
  },
  {
    key: 'frequencyType',
    label: 'Frequency',
    sortable: false
  },
  {
    key: 'amountTransferred',
    label: 'Max Amount',
    sortable: false
  },
  {
    key: 'status',
    label: 'Status'
  },
  {
    key: 'action',
    label: 'Action',
    sortable: false
  }
] as TableColumn[]

//#endregion Composables
const { data: contractOwnerAddress, error: errorGetOwner } = useReadContract({
  functionName: 'owner',
  address: expenseAccountEip712Address,
  abi: EXPENSE_ACCOUNT_EIP712_ABI
})
//deactivate approval
const {
  writeContract: executeDeactivateApproval,
  error: errorDeactivateApproval,
  data: deactivateHash
} = useWriteContract()

const { isLoading: isConfirmingDeactivate, isSuccess: isConfirmedDeactivate } =
  useWaitForTransactionReceipt({
    hash: deactivateHash
  })

//activate approval
const {
  writeContract: executeActivateApproval,
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
    addErrorToast('Failed to deactivate')
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
    addErrorToast('Failed to activate')
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
    addSuccessToast('Activate Successful')
  }
})
watch(isConfirmingDeactivate, async (isConfirming, wasConfirming) => {
  if (!isConfirming && wasConfirming && isConfirmedDeactivate.value) {
    signatureToUpdate.value = ''
    isLoadingSetStatus.value = false
    queryClient.invalidateQueries({ queryKey: ['getExpenseData'] })
    addSuccessToast('Deactivate Successful')
  }
})
watch(errorDeactivateApproval, (newVal) => {
  if (newVal) {
    isLoadingSetStatus.value = false
    log.error(parseError(newVal))
    addErrorToast('Failed to deactivate approval')
  }
})
watch(errorActivateApproval, (newVal) => {
  if (newVal) {
    isLoadingSetStatus.value = false
    log.error(parseError(newVal))
    addErrorToast('Failed to activate approval')
  }
})
watch(errorGetOwner, (newVal) => {
  if (newVal) {
    log.error(parseError(newVal))
    addErrorToast('Error Getting Contract Owner')
  }
})
//#endregion
</script>
