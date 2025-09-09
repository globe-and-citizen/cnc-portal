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
      <template #expiryDate-data="{ row }">
        <span>{{ new Date(Number(row.expiry) * 1000).toLocaleString('en-US') }}</span>
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
      <template #maxAmountPerTx-data="{ row }">
        <span
          >{{ row.budgetData.find((item: BudgetData) => item.budgetType === 2)?.value }}
          {{ tokenSymbol(row.tokenAddress) }}</span
        >
      </template>
      <template #transactions-data="{ row }">
        <span
          >{{ row.balances[0] }}/{{
            row.budgetData.find((item: BudgetData) => item.budgetType === 0)?.value
          }}
          TXs</span
        >
      </template>
      <template #amountTransferred-data="{ row }">
        <span
          >{{ row.balances[1] }}/{{
            row.budgetData.find((item: BudgetData) => item.budgetType === 1)?.value
          }}
          {{ tokenSymbol(row.tokenAddress) }}</span
        >
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
import { type Address, keccak256 } from 'viem'
import { useReadContract, useWaitForTransactionReceipt, useWriteContract } from '@wagmi/vue'
import expenseAccountABI from '@/artifacts/abi/expense-account-eip712.json'
import UserComponent from '@/components/UserComponent.vue'
import { useQueryClient } from '@tanstack/vue-query'
import { useTanstackQuery } from '@/composables'
import type { BudgetData, ExpenseResponse } from '@/types'

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
} = useTanstackQuery<ExpenseResponse[]>(
  'expenseData',
  computed(() => `/expense?teamId=${teamStore.currentTeamId}`),
  {
    queryKey: ['getExpenseData'],
    refetchInterval: 10000,
    refetchOnWindowFocus: true
  }
)

const formattedExpenseData = computed(() => {
  return expenseData.value?.map((expense) => {
    return {
      ...expense.data,
      ...expense
    }
  })
})

const expenseAccountEip712Address = computed(
  () =>
    teamStore.currentTeam?.teamContracts?.find(
      (contract) => contract.type === 'ExpenseAccountEIP712'
    )?.address as Address
)
const columns = [
  {
    key: 'member',
    label: 'Member',
    sortable: false
  },
  {
    key: 'expiryDate',
    label: 'Expiry',
    sortable: true
  },
  {
    key: 'maxAmountPerTx',
    label: 'Max Ammount Per Tx',
    sortable: false
  },
  {
    key: 'transactions',
    label: 'Max Transactions',
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
  address: expenseAccountEip712Address as unknown as Address,
  abi: expenseAccountABI
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
  const signatureHash = keccak256(signature)

  executeDeactivateApproval({
    address: expenseAccountEip712Address.value,
    args: [signatureHash],
    abi: expenseAccountABI,
    functionName: 'deactivateApproval'
  })
}

const activateApproval = async (signature: `0x{string}`) => {
  const signatureHash = keccak256(signature)

  executeActivateApproval({
    address: expenseAccountEip712Address.value,
    args: [signatureHash],
    abi: expenseAccountABI,
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
    log.error(parseError(newVal))
    addErrorToast('Failed to deactivate approval')
  }
})
watch(errorActivateApproval, (newVal) => {
  if (newVal) {
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
