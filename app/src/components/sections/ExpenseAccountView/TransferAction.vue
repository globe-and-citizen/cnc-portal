<template>
  <div>
    <ButtonUI
      variant="success"
      :disabled="row.status !== 'enabled'"
      @click="showModal = true"
      data-test="transfer-button"
    >
      Spend
    </ButtonUI>

    <teleport to="body">
      <ModalComponent
        v-model="showModal"
        @closeWithReset="handleTransferModalResetClose"
        @closeWithoutReset="handleTransferModalNormalClose"
      >
        <TransferForm
          ref="transferFormRef"
          v-if="showModal && getTokens([row], row.signature, balances).length > 0"
          v-model="transferData"
          :tokens="getTokens([row], row.signature, balances)"
          :loading="isLoadingTransfer || isConfirmingTransfer || transferERC20loading"
          service="Expense Account"
          :expense-balance="expenseBalance"
          @transfer="
            async (data) => {
              await transferFromExpenseAccount(data.address.address, data.amount)
            }
          "
          @closeModal="showModal = false"
        />
      </ModalComponent>
    </teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import ButtonUI from '@/components/ButtonUI.vue'
import ModalComponent from '@/components/ModalComponent.vue'
import TransferForm from '@/components/forms/TransferForm.vue'
import { USDC_ADDRESS, type TokenId } from '@/constant'
import type { BudgetData, BudgetLimit } from '@/types'
import { useContractBalance } from '@/composables'
import { useTeamStore, useToastStore, useUserDataStore } from '@/stores'
import { getTokens, log, parseError } from '@/utils'
import { useWaitForTransactionReceipt, useWriteContract } from '@wagmi/vue'
import { encodeFunctionData, parseEther, zeroAddress, type Abi, type Address } from 'viem'
import expenseAccountABI from '@/artifacts/abi/expense-account-eip712.json'
import { estimateGas, readContract } from '@wagmi/core'
import { config } from '@/wagmi.config'
import ERC20ABI from '@/artifacts/abi/erc20.json'
import { useQueryClient } from '@tanstack/vue-query'
import type { TableRow } from '@/components/TableComponent.vue'

const props = defineProps<{ row: TableRow }>()

const teamStore = useTeamStore()
const userDataStore = useUserDataStore()
const { addErrorToast, addSuccessToast } = useToastStore()
const { balances } = useContractBalance(
  ref(teamStore.getContractAddressByType('ExpenseAccountEIP712'))
)
const queryClient = useQueryClient()

const showModal = ref(false)
const tokenAmount = ref('')
const tokenRecipient = ref('')
const transferFormRef = ref<InstanceType<typeof TransferForm> | null>(null)
const transferData = ref({
  address: { name: '', address: '' },
  token: { symbol: '', balance: 0, tokenId: '' as TokenId },
  amount: '0'
})
const expenseBalance = computed(() => {
  const budgetData = props.row.data.budgetData as BudgetData[]
  const maxAmountData = budgetData.find((item) => item.budgetType === 1)?.value
  const amountTransferred = props.row.balances[1]
  return maxAmountData && amountTransferred
    ? Number(maxAmountData) - Number(amountTransferred)
    : null
})

//#region Computed Values
const expenseAccountEip712Address = computed(() =>
  teamStore.getContractAddressByType('ExpenseAccountEIP712')
)
//#endregion

//#region Composables
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

  const budgetLimit = props.row.data

  if (expenseAccountEip712Address.value && props.row) {
    if (budgetLimit.tokenAddress === zeroAddress) await transferNativeToken(to, amount, budgetLimit)
    else await transferErc20Token()
  }
}

const transferNativeToken = async (to: string, amount: string, budgetLimit: BudgetLimit) => {
  try {
    if (!expenseAccountEip712Address.value || !amount || !to) return
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
      props.row.signature
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
    !props.row
  )
    return

  const tokenAddress = USDC_ADDRESS

  transferERC20loading.value = true
  const _amount = BigInt(Number(tokenAmount.value) * 1e6)

  const budgetLimit = props.row.data

  const allowance = await readContract(config, {
    address: tokenAddress as Address,
    abi: ERC20ABI,
    functionName: 'allowance',
    args: [userDataStore.address as Address, expenseAccountEip712Address.value]
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
        props.row.signature // signatureToTransfer.value
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
watch(isConfirmingTransfer, async (isConfirming, wasConfirming) => {
  if (!isConfirming && wasConfirming && isConfirmedTransfer.value) {
    addSuccessToast('Transfer Successful')
    showModal.value = false
    transferERC20loading.value = false
    queryClient.invalidateQueries({ queryKey: ['getExpenseData'] })
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

// Modal close handlers
const handleTransferModalResetClose = () => {
  if (transferFormRef.value) {
    transferFormRef.value.resetForm()
  }
  showModal.value = false
}

const handleTransferModalNormalClose = () => {
  showModal.value = false
}
</script>
