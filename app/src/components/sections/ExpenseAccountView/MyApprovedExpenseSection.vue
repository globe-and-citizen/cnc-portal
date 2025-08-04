<template>
  <CardComponent title="My Approved Expense">
    <div v-if="expenseAccountEip712Address && newExpenseData">
      <!-- TODO display this only if the use have an approved expense -->
      <!-- Expense A/c Info Section -->
      <!-- New Header -->
      <TableComponent
        :rows="getCurrentUserExpenses(newExpenseData, currentUserAddress)"
        :columns="columns"
      >
        <template #action-data="{ row }">
          <ButtonUI
            variant="success"
            :disabled="!expenseDataStore.myApprovedExpenses || row.status !== 'enabled'"
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
          <span>{{ new Date(Number(row.data.expiry) * 1000).toLocaleString('en-US') }}</span>
        </template>
        <template #maxAmountPerTx-data="{ row }">
          <span>
            {{ row.data.budgetData[2]?.value }} {{ tokenSymbol(row.data.tokenAddress) }}
          </span>
        </template>
        <template #transactions-data="{ row }">
          <span>{{ row.balances[0] }}/{{ row.data.budgetData[0]?.value }} TXs</span>
        </template>
        <template #amountTransferred-data="{ row }">
          <span
            >{{ row.balances[1] }}/{{ row.data.budgetData[1]?.value }}
            {{ tokenSymbol(row.data.tokenAddress) }}</span
          >
        </template>
      </TableComponent>

      <ModalComponent v-model="transferModal">
        <TransferForm
          v-if="
            transferModal && getTokens(newExpenseData, signatureToTransfer, balances).length > 0
          "
          v-model="transferData"
          :tokens="getTokens(newExpenseData, signatureToTransfer, balances)"
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
import { computed, ref, watch } from 'vue'
import type { BudgetLimit, BudgetData, ExpenseResponse } from '@/types'
import { USDC_ADDRESS } from '@/constant'
import CardComponent from '@/components/CardComponent.vue'
import TransferForm, { type Token } from '@/components/forms/TransferForm.vue'
import ModalComponent from '@/components/ModalComponent.vue'
import { useUserDataStore, useToastStore, useTeamStore, useExpenseDataStore } from '@/stores'
import { parseError, log, tokenSymbol, getCurrentUserExpenses, getTokens } from '@/utils'
import { useWriteContract, useWaitForTransactionReceipt } from '@wagmi/vue'
import { estimateGas } from '@wagmi/core'
import expenseAccountABI from '@/artifacts/abi/expense-account-eip712.json'
import { type Address, parseEther, zeroAddress, encodeFunctionData, type Abi } from 'viem'
import ButtonUI from '@/components/ButtonUI.vue'
import ERC20ABI from '@/artifacts/abi/erc20.json'
import { readContract } from '@wagmi/core'
import { config } from '@/wagmi.config'
import TableComponent, { type TableColumn } from '@/components/TableComponent.vue'
import { useContractBalance, useTanstackQuery } from '@/composables'
import type { TokenId } from '@/constant'
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
    label: 'Max Transactions',
    sortable: false
  },
  {
    key: 'amountTransferred',
    label: 'Max Amount',
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
  token: { symbol: '', balance: 0, tokenId: '' as TokenId },
  amount: '0'
})
//#endregion

const teamStore = useTeamStore()
const currentUserAddress = useUserDataStore().address
const expenseDataStore = useExpenseDataStore()
const { balances } = useContractBalance(
  ref(teamStore.getContractAddressByType('ExpenseAccountEIP712'))
)

const {
  data: newExpenseData,
  isLoading: isFetchingExpenseData,
  error: errorFetchingExpenseData
} = useTanstackQuery<ExpenseResponse[]>(
  'expenseData',
  computed(() => `/expense?teamId=${teamStore.currentTeamId}`),
  {
    queryKey: ['expenseData'],
    refetchInterval: 10000,
    refetchOnWindowFocus: true
  }
)

//#region Computed Values
const expenseAccountEip712Address = computed(
  () =>
    teamStore.currentTeam?.teamContracts.find(
      (contract) => contract.type === 'ExpenseAccountEIP712'
    )?.address as Address
)
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

  if (expenseAccountEip712Address.value && expenseDataStore.myApprovedExpenses) {
    if (budgetLimit.tokenAddress === zeroAddress) await transferNativeToken(to, amount, budgetLimit)
    else await transferErc20Token()
  }
}

const transferNativeToken = async (to: string, amount: string, budgetLimit: BudgetLimit) => {
  try {
    const args = [
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
    ]
    const data = encodeFunctionData({
      abi: expenseAccountABI,
      functionName: 'transfer',
      args
    })
    await estimateGas(config, {
      to: expenseAccountEip712Address.value,
      data
    })
    executeExpenseAccountTransfer({
      address: expenseAccountEip712Address.value,
      args,
      abi: expenseAccountABI,
      functionName: 'transfer'
    })
  } catch (error) {
    console.error('Error in transferNativeToken:', parseError(error, expenseAccountABI as Abi))
    log.error('Error in transferNativeToken:', parseError(error, expenseAccountABI as Abi))
    addErrorToast(parseError(error, expenseAccountABI as Abi))
    transferERC20loading.value = false
    isLoadingTransfer.value = false
  }
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
    try {
      const args = [
        tokenRecipient.value,
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
      const data = encodeFunctionData({
        abi: expenseAccountABI,
        functionName: 'transfer',
        args
      })
      await estimateGas(config, {
        to: expenseAccountEip712Address.value,
        data
      })
      executeExpenseAccountTransfer({
        address: expenseAccountEip712Address.value,
        abi: expenseAccountABI,
        functionName: 'transfer',
        args
      })
    } catch (error) {
      log.error('Error in transferErc20Token:', error)
      addErrorToast(parseError(error, expenseAccountABI as Abi))
      transferERC20loading.value = false
      isLoadingTransfer.value = false
    }
  }
}
//#endregion

//#region Watchers
watch(newExpenseData, (newData) => {
  if (newData) {
    // console.log(`newexpenseData: `, newData)
  }
})
watch(isConfirmingTransfer, async (isConfirming, wasConfirming) => {
  if (!isConfirming && wasConfirming && isConfirmedTransfer.value) {
    addSuccessToast('Transfer Successful')
    // await refetchBalances()
    transferModal.value = false
    transferERC20loading.value = false
    await expenseDataStore.fetchAllExpenseData()
  }
})
watch(errorTransfer, (newVal) => {
  if (errorTransfer.value) {
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
</script>
