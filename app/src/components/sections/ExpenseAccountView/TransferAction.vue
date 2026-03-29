<template>
  <div>
    <UButton
      color="success"
      :disabled="row.status !== 'enabled'"
      @click="showModal = { mount: true, show: true }"
      data-test="transfer-button"
    >
      Spend
    </UButton>

    <UModal
      v-if="showModal.mount"
      v-model:open="showModal.show"
      data-test="transfer-modal"
      title="Transfer from Expenses Contract"
      :description="
        expenseBalance
          ? `Spendable balance: ${tokens[0]?.spendableBalance ?? tokens[0]?.balance ?? 0} ${transferData.token.symbol}`
          : undefined
      "
      :close="{
        onClick: () => {
          showModal = { mount: false, show: false }
        }
      }"
    >
      <template #body>
        <TransferForm
          v-if="showModal.mount && tokens.length > 0"
          v-model="transferData"
          :tokens="tokens"
          :loading="isLoadingTransfer || isConfirmingTransfer || transferERC20loading"
          @transfer="
            async (data) => {
              await transferFromExpenseAccount(data.address.address, data.amount)
            }
          "
          @vue:unmounted="
            () => {
              transferData = createDefaultTransferData()
            }
          "
          @closeModal="showModal = { mount: false, show: false }"
        >
          <template #label>
            <span class="label-text">Transfer From</span>
            <span class="label-text-alt"
              >Limit: {{ row.data.amount }} {{ transferData.token.symbol }}
            </span>
          </template>
        </TransferForm>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import TransferForm from '@/components/forms/TransferForm.vue'
import { USDC_ADDRESS, type TokenId } from '@/constant'
import type { BudgetLimit } from '@/types'
import { useContractBalance } from '@/composables'
import { useTeamStore, useUserDataStore } from '@/stores'
import { getTokens, log, parseError } from '@/utils'
import { useWaitForTransactionReceipt, useWriteContract } from '@wagmi/vue'
import { encodeFunctionData, parseEther, zeroAddress, type Address } from 'viem'
import { EXPENSE_ACCOUNT_EIP712_ABI } from '@/artifacts/abi/expense-account-eip712'
import { estimateGas, readContract, simulateContract } from '@wagmi/core'
import { config } from '@/wagmi.config'
import { ERC20_ABI } from '@/artifacts/abi/erc20'
import { useQueryClient } from '@tanstack/vue-query'
import type { TableRow } from '@/components/TableComponent.vue'
import type { TransferData } from '@/types'
const props = defineProps<{ row: TableRow }>()

const teamStore = useTeamStore()
const userDataStore = useUserDataStore()
const toast = useToast()
const { balances } = useContractBalance(
  ref(teamStore.getContractAddressByType('ExpenseAccountEIP712'))
)
const queryClient = useQueryClient()

const showModal = ref({ mount: false, show: false })
const tokenAmount = ref('')
const tokenRecipient = ref('')

// Helper function to create default transfer data
const createDefaultTransferData = (): TransferData => ({
  address: { name: '', address: '' },
  token: {
    symbol: '',
    balance: 0,
    tokenId: 'usdc' as TokenId,
    price: 0,
    code: 'USD',
    spendableBalance: 0
  },
  amount: '0'
})

const transferData = ref(createDefaultTransferData())
const expenseBalance = computed(() => {
  const maxAmountData = props.row.data.amount
  const amountTransferred = props.row.balances[1]
  return maxAmountData && amountTransferred
    ? Number(maxAmountData) - Number(amountTransferred)
    : null
})

//#region Computed Values
const expenseAccountEip712Address = computed(() =>
  teamStore.getContractAddressByType('ExpenseAccountEIP712')
)

const tokens = computed(() => getTokens([props.row], props.row.signature, balances.value))
//#endregion

//#region Composables
//expense account transfer
const {
  mutate: executeExpenseAccountTransfer,
  isPending: isLoadingTransfer,
  error: errorTransfer,
  data: transferHash
} = useWriteContract()

const {
  isLoading: isConfirmingTransfer,
  isSuccess: isConfirmedTransfer,
  error: confirmingTransferError
} = useWaitForTransactionReceipt({
  hash: transferHash
})

// Token approval
const { mutate: approve, error: approveError, data: approveHash } = useWriteContract()

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
        amount:
          budgetLimit.tokenAddress === zeroAddress
            ? parseEther(`${budgetLimit.amount}`)
            : BigInt(Number(budgetLimit.amount) * 1e6),
        frequencyType: Number(budgetLimit.frequencyType),
        customFrequency: BigInt(Number(budgetLimit.customFrequency)),
        startDate: Number(budgetLimit.startDate),
        endDate: Number(budgetLimit.endDate)
      },
      props.row.signature
    ]
    const data = encodeFunctionData({
      abi: EXPENSE_ACCOUNT_EIP712_ABI,
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
      abi: EXPENSE_ACCOUNT_EIP712_ABI,
      functionName: 'transfer'
    })
  } catch (error) {
    console.error('Error in transferNativeToken:', parseError(error, EXPENSE_ACCOUNT_EIP712_ABI))
    log.error('Error in transferNativeToken:', parseError(error, EXPENSE_ACCOUNT_EIP712_ABI))
    toast.add({ title: parseError(error, EXPENSE_ACCOUNT_EIP712_ABI), color: 'error' })
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
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [userDataStore.address as Address, expenseAccountEip712Address.value]
  })

  const currentAllowance = allowance ? allowance.toString() : 0n
  if (Number(currentAllowance) < Number(_amount)) {
    approve({
      address: tokenAddress as Address,
      abi: ERC20_ABI,
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
          amount: BigInt(Number(budgetLimit.amount) * 1e6),
          frequencyType: Number(budgetLimit.frequencyType),
          customFrequency: BigInt(Number(budgetLimit.customFrequency)),
          startDate: Number(budgetLimit.startDate),
          endDate: Number(budgetLimit.endDate)
        },
        props.row.signature
      ]

      await simulateContract(config, {
        address: expenseAccountEip712Address.value,
        abi: EXPENSE_ACCOUNT_EIP712_ABI,
        functionName: 'transfer',
        args
      })
      executeExpenseAccountTransfer({
        address: expenseAccountEip712Address.value,
        abi: EXPENSE_ACCOUNT_EIP712_ABI,
        functionName: 'transfer',
        args
      })
    } catch (error) {
      log.error('Error in transferErc20Token:', error)
      toast.add({ title: parseError(error, EXPENSE_ACCOUNT_EIP712_ABI), color: 'error' })
      transferERC20loading.value = false
      isLoadingTransfer.value = false
    }
  }
}
//#endregion

//#region Watchers
watch(isConfirmingTransfer, async (isConfirming, wasConfirming) => {
  if (!isConfirming && wasConfirming && isConfirmedTransfer.value) {
    toast.add({ title: 'Transfer Successful', color: 'success' })
    showModal.value = { mount: false, show: false }
    transferERC20loading.value = false
    queryClient.invalidateQueries({ queryKey: ['getExpenseData'] })
  }
})
watch(errorTransfer, (newVal) => {
  if (errorTransfer.value) {
    transferERC20loading.value = false
    isLoadingTransfer.value = false
    log.error(parseError(newVal, EXPENSE_ACCOUNT_EIP712_ABI))
    toast.add({ title: 'Failed to transfer', color: 'error' })
  }
})
watch(isConfirmingApprove, (newIsConfirming, oldIsConfirming) => {
  if (!newIsConfirming && oldIsConfirming && isConfirmedApprove.value) {
    toast.add({ title: 'Approval granted successfully', color: 'success' })
    transferERC20loading.value = false
    transferErc20Token()
  }
})
watch(approveError, () => {
  if (approveError.value) {
    transferERC20loading.value = false
    log.error(parseError(approveError.value))
    toast.add({ title: 'Failed to approve token spending', color: 'error' })
  }
})
watch(confirmingTransferError, (newError) => {
  if (newError) {
    transferERC20loading.value = false
    isLoadingTransfer.value = false
    log.error(parseError(newError, EXPENSE_ACCOUNT_EIP712_ABI))
    toast.add({ title: 'Failed to transfer after approval', color: 'error' })
  }
})
//#endregion
</script>
