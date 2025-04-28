<template>
  <CardComponent title="My Approved Expense">
    <div v-if="expenseAccountEip712Address">
      <!-- TODO display this only if the use have an approved expense -->
      <!-- Expense A/c Info Section -->
      <!-- New Header -->
      <TableComponent :rows="myApprovedExpenseRows" :columns="columns">
        <template #action-data="{ row }">
          <ButtonUI
            variant="success"
            :disabled="!expenseDataStore.myApprovedExpenses || isDisapprovedAddress"
            v-if="true"
            @click="
              () => {
                signatureToTransfer = row.signature
                transferModal = true
              }
            "
            data-test="transfer-button"
            >Spend</ButtonUI
          >
        </template>
        <template #expiryDate-data="{ row }">
          <span>{{ new Date(Number(row.expiry) * 1000).toLocaleString('en-US') }}</span>
        </template>
        <template #maxAmountPerTx-data="{ row }">
          <span> {{ row.budgetData[2]?.value }} {{ tokenSymbol(row.tokenAddress) }} </span>
        </template>
        <template #transactions-data="{ row }">
          <span>{{ row.balances[0] }}/{{ row.budgetData[0]?.value }}</span>
        </template>
        <template #amountTransferred-data="{ row }">
          <span>{{ row.balances[1] }}/{{ row.budgetData[1]?.value }}</span>
        </template>
      </TableComponent>

      <ModalComponent v-model="transferModal">
        <TransferForm
          v-if="transferModal && tokens.length > 0 /*expenseDataStore.myApprovedExpenses*/"
          v-model="transferData"
          :tokens="
            /*[
            {
              symbol: tokenSymbol(
                /*expenseDataStore.myApprovedExpenses.find(
                  (item) => item.signature === signatureToTransfer
                )?.tokenAddress ?? ''
                myApprovedExpenseRows.find(
                  (item) => item.signature === signatureToTransfer
                )?.tokenAddress ?? ''
              ),
              balance:
                /*expenseDataStore.myApprovedExpensesmyApprovedExpenseRows.find(
                  (item) => item.signature === signatureToTransfer
                )?.tokenAddress === zeroAddress
                  ? balances.nativeToken.formatted
                  : balances.usdc.formatted
            }
          ]*/ tokens
          "
          :loading="isLoadingTransfer || isConfirmingTransfer || transferERC20loading"
          service="Expense Account"
          @transfer="
            async (data) => {
              await transferFromExpenseAccount(data.address.address, data.amount)
            }
          "
          @closeModal="() => (transferModal = false)"
        />
      </ModalComponent>
    </div>
  </CardComponent>
</template>

<script setup lang="ts">
//#region Imports
import { computed, onMounted, ref, watch } from 'vue'
import type { BudgetLimit, BudgetData } from '@/types'
import { USDC_ADDRESS } from '@/constant'
import CardComponent from '@/components/CardComponent.vue'
import TransferForm from '@/components/forms/TransferForm.vue'
import ModalComponent from '@/components/ModalComponent.vue'
import { useUserDataStore, useToastStore, useTeamStore, useExpenseDataStore } from '@/stores'
import { parseError, log, tokenSymbol } from '@/utils'
import { useWriteContract, useWaitForTransactionReceipt } from '@wagmi/vue'
import expenseAccountABI from '@/artifacts/abi/expense-account-eip712.json'
import { type Address, parseEther, zeroAddress } from 'viem'
import ButtonUI from '@/components/ButtonUI.vue'
import ERC20ABI from '@/artifacts/abi/erc20.json'
import { readContract } from '@wagmi/core'
import { config } from '@/wagmi.config'
import TableComponent, { type TableColumn } from '@/components/TableComponent.vue'
import { useContractBalance } from '@/composables'
//#endregion

const columns = [
  {
    key: 'expiryDate',
    label: 'Expiry Date',
    sortable: true
  },
  {
    key: 'maxAmountPerTx',
    label: 'Max Ammount Per Tx',
    sortable: false
  },
  {
    key: 'transactions',
    label: 'Total Transactions',
    sortable: false
  },
  {
    key: 'amountTransferred',
    label: 'Amount Transferred',
    sortable: false
  },
  {
    key: 'action',
    label: 'Action',
    sortable: false
  }
] as TableColumn[]

//#region refs
const transferModal = ref(false)
const tokenAmount = ref('')
const tokenRecipient = ref('')
const signatureToTransfer = ref('')
const transferData = ref({
  address: { name: '', address: '' },
  token: { symbol: '', balance: '0' },
  amount: '0'
})
//#endregion

const teamStore = useTeamStore()
const currentUserAddress = useUserDataStore().address
const expenseDataStore = useExpenseDataStore()
const { balances, refetch: refetchBalances } = useContractBalance(
  teamStore.currentTeam?.teamContracts.find((contract) => contract.type === 'ExpenseAccountEIP712')
    ?.address as Address
)

//#region Computed Values
const isDisapprovedAddress = computed(
  () =>
    expenseDataStore.allExpenseDataParsed.findIndex(
      (item) =>
        item.approvedAddress === currentUserAddress &&
        (item.status === 'disabled' || item.status === 'expired')
    ) !== -1
)
const expenseAccountEip712Address = computed(
  () =>
    teamStore.currentTeam?.teamContracts.find(
      (contract) => contract.type === 'ExpenseAccountEIP712'
    )?.address as Address
)
const myApprovedExpenseRows = computed(() =>
  expenseDataStore.allExpenseDataParsed.filter(
    (approval) => approval.approvedAddress === currentUserAddress
  )
)
const tokens = computed(() => {
  const tokenAddress = expenseDataStore.allExpenseDataParsed.find(
    (item) => item.signature === signatureToTransfer.value
  )?.tokenAddress

  const symbol = tokenSymbol(tokenAddress ?? '')
  const balance =
    tokenAddress === zeroAddress ? balances.nativeToken.formatted : balances.usdc.formatted

  return symbol && !isNaN(Number(balance)) ? [{ symbol, balance }] : []
})
//#endregion

//#region Composables
const { addErrorToast, addSuccessToast } = useToastStore()

//expense account transfer
const {
  writeContract: executeExpenseAccountTransfer,
  isPending: isLoadingTransfer,
  error: errorTransfer,
  data: transferHash
} = useWriteContract()

const { isLoading: isConfirmingTransfer, isSuccess: isConfirmedTransfer } =
  useWaitForTransactionReceipt({
    hash: transferHash
  })

// Token approval
const { writeContract: approve, error: approveError, data: approveHash } = useWriteContract()

const { isLoading: isConfirmingApprove, isSuccess: isConfirmedApprove } =
  useWaitForTransactionReceipt({
    hash: approveHash
  })
//#endregion

//#region Functions
const transferFromExpenseAccount = async (to: string, amount: string) => {
  tokenAmount.value = amount
  tokenRecipient.value = to

  const budgetLimit = expenseDataStore.myApprovedExpenses.find(
    (item) => item.signature === signatureToTransfer.value
  ) as BudgetLimit

  // if (!budgetLimit) {
  //   addErrorToast('No budget limit found')
  //   return
  // }

  if (expenseAccountEip712Address.value && expenseDataStore.myApprovedExpenses) {
    if (budgetLimit.tokenAddress === zeroAddress) transferNativeToken(to, amount, budgetLimit)
    else await transferErc20Token()
  }
}

const transferNativeToken = (to: string, amount: string, budgetLimit: BudgetLimit) => {
  executeExpenseAccountTransfer({
    address: expenseAccountEip712Address.value,
    args: [
      to,
      parseEther(amount),
      {
        ...budgetLimit,
        budgetData: budgetLimit.budgetData.map((item) => ({
          ...item,
          value:
            item.budgetType === 0
              ? item.value
              : budgetLimit.tokenAddress === zeroAddress
                ? parseEther(`${item.value}`)
                : BigInt(Number(item.value) * 1e6)
        }))
      },
      signatureToTransfer.value
    ],
    abi: expenseAccountABI,
    functionName: 'transfer'
  })
}
const transferERC20loading = ref(false)
// Token transfer function
const transferErc20Token = async () => {
  if (
    !expenseAccountEip712Address.value ||
    !tokenAmount.value ||
    !tokenRecipient.value ||
    !expenseDataStore.myApprovedExpenses
  )
    return

  const tokenAddress = USDC_ADDRESS

  transferERC20loading.value = true
  const _amount = BigInt(Number(tokenAmount.value) * 1e6)

  const budgetLimit = expenseDataStore.myApprovedExpenses.find(
    (item) => item.signature === signatureToTransfer.value
  ) as BudgetLimit

  // if (!budgetLimit) {
  //   addErrorToast('No budget limit found')
  //   return
  // }

  const allowance = await readContract(config, {
    address: tokenAddress as Address,
    abi: ERC20ABI,
    functionName: 'allowance',
    args: [currentUserAddress as Address, expenseAccountEip712Address.value]
  })

  const currentAllowance = allowance ? allowance.toString() : 0n
  if (Number(currentAllowance) < Number(_amount)) {
    approve({
      address: tokenAddress as Address,
      abi: ERC20ABI,
      functionName: 'approve',
      args: [expenseAccountEip712Address.value, _amount]
    })
  } else {
    executeExpenseAccountTransfer({
      address: expenseAccountEip712Address.value,
      abi: expenseAccountABI,
      functionName: 'transfer',
      args: [
        tokenRecipient.value as Address,
        _amount,
        {
          ...budgetLimit,
          budgetData: budgetLimit.budgetData.map((item: BudgetData) => ({
            ...item,
            value: item.budgetType === 0 ? item.value : BigInt(Number(item.value) * 1e6)
          }))
        },
        signatureToTransfer.value
      ]
    })
  }
}
//#endregion

//#region Watchers
watch(isConfirmingTransfer, async (isConfirming, wasConfirming) => {
  if (!isConfirming && wasConfirming && isConfirmedTransfer.value) {
    addSuccessToast('Transfer Successful')
    await refetchBalances()
    transferModal.value = false
    transferERC20loading.value = false
    await expenseDataStore.fetchAllExpenseData()
  }
})
watch(errorTransfer, (newVal) => {
  if (newVal) {
    transferERC20loading.value = false
    isLoadingTransfer.value = false
    log.error(parseError(newVal))
    addErrorToast('Failed to transfer')
  }
})
watch(isConfirmingApprove, (newIsConfirming, oldIsConfirming) => {
  if (!newIsConfirming && oldIsConfirming && isConfirmedApprove.value) {
    addSuccessToast('Approval granted successfully')
    transferERC20loading.value = false
    transferErc20Token()
  }
})
watch(approveError, () => {
  if (approveError.value) {
    transferERC20loading.value = false
    log.error(parseError(approveError.value))
    addErrorToast('Failed to approve token spending')
  }
})
//#endregion
onMounted(() => {
  console.log('tokens: ', tokens.value)
})
</script>
