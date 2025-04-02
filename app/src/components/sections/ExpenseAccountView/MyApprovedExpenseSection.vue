<template>
  <CardComponent title="My Approved Expense">
    <div v-if="expenseAccountEip712Address">
      <!-- TODO display this only if the use have an approved expense -->
      <!-- Expense A/c Info Section -->
      <section class="stat flex flex-col justify-start">
        <!-- New Header -->

        <div class="flex flex-col gap-8">
          <div class="overflow-x-auto" data-test="approval-table">
            <table class="table">
              <!-- head -->
              <thead class="text-sm font-bold">
                <tr>
                  <th>Expiry Date</th>
                  <th>Max Amount Per Tx</th>
                  <th>Total Transactions</th>
                  <th>Total Transfers</th>
                  <th class="flex justify-end">Action</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{{ expiry }}</td>
                  <td>
                    {{ maxLimitAmountPerTx }}
                    {{
                      _expenseAccountData?.data &&
                      tokenSymbol(JSON.parse(_expenseAccountData?.data)?.tokenAddress)
                    }}
                  </td>
                  <td>{{ `${dynamicDisplayDataTx.value}/${maxLimitTxsPerPeriod}` }}</td>
                  <td>{{ `${dynamicDisplayDataAmount.value}/${maxLimitAmountPerPeriod}` }}</td>
                  <td class="flex justify-end" data-test="action-td">
                    <ButtonUI
                      variant="success"
                      :disabled="!_expenseAccountData?.data || isDisapprovedAddress"
                      v-if="true"
                      @click="transferModal = true"
                      data-test="transfer-button"
                    >
                      Spend
                    </ButtonUI>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <ModalComponent v-model="transferModal">
          <TransferForm
            v-if="transferModal && _expenseAccountData?.data"
            v-model="transferData"
            :tokens="[
              {
                symbol: tokenSymbol(JSON.parse(_expenseAccountData?.data)?.tokenAddress),
                balance:
                  JSON.parse(_expenseAccountData?.data)?.tokenAddress === zeroAddress
                    ? expenseBalanceFormatted
                    : `${Number(usdcBalance) / 1e6}`
              }
            ]"
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
      </section>
    </div>
  </CardComponent>
</template>

<script setup lang="ts">
//#region Imports
import { computed, onMounted, ref, watch } from 'vue'
import type { Team, BudgetLimit, BudgetData } from '@/types'
import { USDC_ADDRESS } from '@/constant'
import CardComponent from '@/components/CardComponent.vue'
import TransferForm from '@/components/forms/TransferForm.vue'
import ModalComponent from '@/components/ModalComponent.vue'
import { useUserDataStore, useToastStore } from '@/stores'
import { useCustomFetch } from '@/composables/useCustomFetch'
import { parseError, log, tokenSymbol } from '@/utils'
import {
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  useChainId,
  useBalance
} from '@wagmi/vue'
import expenseAccountABI from '@/artifacts/abi/expense-account-eip712.json'
import { type Address, formatEther, parseEther, keccak256, zeroAddress } from 'viem'
import ButtonUI from '@/components/ButtonUI.vue'
import ERC20ABI from '@/artifacts/abi/erc20.json'
import { readContract } from '@wagmi/core'
import { config } from '@/wagmi.config'
import { useRoute } from 'vue-router'
//#endregion

const { team } = defineProps<{
  team: Team
  isDisapprovedAddress: boolean
}>()
const reload = defineModel()

//#region refs
const transferModal = ref(false)
const tokenAmount = ref('')
const tokenRecipient = ref('')
const signatureHash = ref<string | null>(null)
const transferData = ref({
  address: { name: '', address: '' },
  token: { symbol: '', balance: '0' },
  amount: '0'
})
//#endregion

const route = useRoute()
const currentUserAddress = useUserDataStore().address

//#region useCustomFetch
const {
  error: fetchExpenseAccountDataError,
  execute: fetchExpenseAccountData,
  data: _expenseAccountData
} = useCustomFetch(`teams/${String(route.params.id)}/expense-data`, {
  immediate: false,
  beforeFetch: async ({ options, url, cancel }) => {
    options.headers = {
      memberaddress: currentUserAddress,
      'Content-Type': 'application/json',
      ...options.headers
    }
    return { options, url, cancel }
  }
})
  .get()
  .json()

//#endregion Computed Values

const expenseAccountEip712Address = computed(
  () =>
    team.teamContracts.find((contract) => contract.type === 'ExpenseAccountEIP712')
      ?.address as Address
)
const expenseBalanceFormatted = computed(() => {
  if (typeof expenseAccountBalance.value?.value === 'bigint')
    return formatEther(expenseAccountBalance.value.value)
  else return '--'
})
const expiry = computed(() => {
  if (_expenseAccountData.value?.data) {
    const unixEpoch = JSON.parse(_expenseAccountData.value.data).expiry
    const date = new Date(Number(unixEpoch) * 1000)
    return date.toLocaleString('en-US')
  } else {
    return '--/--/--, --:--:--'
  }
})
const maxLimit = (budgetType: number) =>
  computed(() => {
    const budgetData =
      _expenseAccountData.value?.data &&
      Array.isArray(JSON.parse(_expenseAccountData.value?.data).budgetData)
        ? JSON.parse(_expenseAccountData.value?.data).budgetData.find(
            (item: BudgetData) => item.budgetType === budgetType
          )
        : undefined
    if (_expenseAccountData.value?.data && budgetData && budgetData.budgetType === budgetType)
      return budgetData.value
    else return '--'
  })
const maxLimitTxsPerPeriod = maxLimit(0)
const maxLimitAmountPerPeriod = maxLimit(1)
const maxLimitAmountPerTx = maxLimit(2)
const dynamicDisplayData = (budgetType: number) =>
  computed(() => {
    const data = {}
    if (
      _expenseAccountData.value?.data &&
      amountWithdrawn.value &&
      Array.isArray(amountWithdrawn.value)
    ) {
      if (budgetType === 0) {
        return {
          ...data,
          value: Number(amountWithdrawn.value[0])
        }
      } else {
        const tokenAddress = JSON.parse(_expenseAccountData.value.data).tokenAddress
        return {
          ...data,
          value:
            tokenAddress === zeroAddress
              ? formatEther(amountWithdrawn.value[1])
              : Number(amountWithdrawn.value[1]) / 1e6
        }
      }
    } else {
      return {
        ...data,
        value: `--`
      }
    }
  })
const dynamicDisplayDataTx = dynamicDisplayData(0)
const dynamicDisplayDataAmount = dynamicDisplayData(1)
//#endregion

//#region Composables
const { addErrorToast, addSuccessToast } = useToastStore()
const chainId = useChainId()

const {
  data: expenseAccountBalance,
  error: isErrorExpenseAccountBalance,
  refetch: fetchExpenseAccountBalance
} = useBalance({
  address: expenseAccountEip712Address,
  chainId
})

// Token balances
const {
  data: usdcBalance,
  refetch: fetchUsdcBalance,
  error: usdcBalanceError
} = useReadContract({
  address: USDC_ADDRESS as Address,
  abi: ERC20ABI,
  functionName: 'balanceOf',
  args: [expenseAccountEip712Address]
})

const {
  data: amountWithdrawn,
  refetch: executeGetAmountWithdrawn,
  error: errorGetAmountWithdrawn
} = useReadContract({
  functionName: 'balances',
  address: expenseAccountEip712Address,
  abi: expenseAccountABI,
  args: [signatureHash]
})

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
const init = async () => {
  await fetchExpenseAccountData()
  await getAmountWithdrawnBalance()
  await fetchUsdcBalance()
  await fetchExpenseAccountBalance()
}

const transferFromExpenseAccount = async (to: string, amount: string) => {
  tokenAmount.value = amount
  tokenRecipient.value = to

  if (expenseAccountEip712Address.value && _expenseAccountData.value.data) {
    const budgetLimit: BudgetLimit = JSON.parse(_expenseAccountData.value.data)

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
      _expenseAccountData.value.signature
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
    !_expenseAccountData.value?.data
  )
    return

  const tokenAddress = USDC_ADDRESS

  transferERC20loading.value = true
  const _amount = BigInt(Number(tokenAmount.value) * 1e6)

  const budgetLimit: BudgetLimit = JSON.parse(_expenseAccountData.value.data)

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
      args: [expenseAccountEip712Address, _amount]
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
          budgetData: budgetLimit.budgetData.map((item) => ({
            ...item,
            value: item.budgetType === 0 ? item.value : BigInt(Number(item.value) * 1e6) //parseEther(`${item.value}`)
          }))
        },
        _expenseAccountData.value.signature
      ]
    })
  }
}

const getAmountWithdrawnBalance = async () => {
  if (expenseAccountEip712Address.value) {
    if (!_expenseAccountData?.value?.data) return
    signatureHash.value = keccak256(_expenseAccountData.value.signature)
    await executeGetAmountWithdrawn()
  }
}
//#endregion

//#region Watch
watch(reload, async (newState) => {
  if (newState) {
    await init()
  }
})
watch(isConfirmingTransfer, async (isConfirming, wasConfirming) => {
  if (!isConfirming && wasConfirming && isConfirmedTransfer.value) {
    reload.value = true
    addSuccessToast('Transfer Successful')
    await init()
    transferModal.value = false
    reload.value = false
  }
})
watch(errorGetAmountWithdrawn, (newVal) => {
  if (newVal) {
    log.error(parseError(newVal))
    addErrorToast('Failed to fetch amount withdrawn')
  }
})
watch(errorTransfer, (newVal) => {
  if (newVal) {
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
watch(fetchExpenseAccountDataError, (newVal) => {
  if (newVal) addErrorToast('Error fetching expense account data')
})
watch(isErrorExpenseAccountBalance, (newVal) => {
  if (newVal) {
    log.error(parseError(newVal))
    addErrorToast('Error fetching expense account data')
  }
})
watch([usdcBalanceError], ([newUsdcError]) => {
  if (newUsdcError) {
    log.error(parseError(newUsdcError))
    addErrorToast('Failed to fetch USDC balance')
  }
})
//#endregion

onMounted(async () => {
  await init()
})
</script>
