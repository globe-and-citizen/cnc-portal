<template>
  <CardComponent title="My Approved Expense">
    <div v-if="expenseAccountEip712Address">
      <!-- TODO display this only if the use have an approved expense -->
      <!-- Expense A/c Info Section -->
      <!-- New Header -->
      <TableComponent :rows="[expenseDataRow]" :columns="columns">
        <template #action-data="{ row }">
          <ButtonUI
            variant="success"
            :disabled="
              !(/*_expenseAccountData?.data*/ expenseDataStore.expenseData?.data) ||
              isDisapprovedAddress
            "
            v-if="true"
            @click="transferModal = true"
            data-test="transfer-button"
            >Spend</ButtonUI
          >
        </template>
        <template #expiryDate="{ row }">
          <span>{{ row.expiryDate }}</span>
        </template>
        <template #maxAmountPerTx="{ row }">
          <span> {{ row.maxAmountPerTx }} {{ _tokenSymbol }} </span>
        </template>
        <template #transactions="{ row }">
          <span>{{ row.transactions }}</span>
        </template>
        <template #amountTransferred="{ row }">
          <span>{{ row.amountTransferred }}</span>
        </template>
      </TableComponent>

      <ModalComponent v-model="transferModal">
        <TransferForm
          v-if="transferModal && /*_expenseAccountData*/ expenseDataStore.expenseData?.data"
          v-model="transferData"
          :tokens="[
            {
              symbol: tokenSymbol(
                JSON.parse(/*_expenseAccountData*/ expenseDataStore.expenseData.data)?.tokenAddress
              ),
              balance:
                JSON.parse(/*_expenseAccountData*/ expenseDataStore.expenseData?.data)
                  ?.tokenAddress === zeroAddress
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
import { useExpenseAccountDataCollection } from '@/composables'
import TableComponent, { type TableColumn } from '@/components/TableComponent.vue'
//#endregion

const reload = defineModel()

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
const signatureHash = ref<string | null>(null)
const transferData = ref({
  address: { name: '', address: '' },
  token: { symbol: '', balance: '0' },
  amount: '0'
})
const isDisapprovedAddress = computed(
  () =>
    manyExpenseAccountDataAll.findIndex(
      (item) =>
        item.approvedAddress === currentUserAddress &&
        (item.status === 'disabled' || item.status === 'expired')
    ) !== -1
)
//#endregion

const route = useRoute()
const teamStore = useTeamStore()
const currentUserAddress = useUserDataStore().address
const { data: manyExpenseAccountDataAll, initializeBalances } = useExpenseAccountDataCollection()
const expenseDataStore = useExpenseDataStore()

//#endregion Computed Values

const expenseAccountEip712Address = computed(
  () =>
    teamStore.currentTeam?./* team.*/ teamContracts.find(
      (contract) => contract.type === 'ExpenseAccountEIP712'
    )?.address as Address
)
const expenseBalanceFormatted = computed(() => {
  if (typeof expenseAccountBalance.value?.value === 'bigint')
    return formatEther(expenseAccountBalance.value.value)
  else return '--'
})
const _tokenSymbol = computed(() => {
  if (expenseDataStore.expenseData?.data) {
    const tokenAddress = JSON.parse(expenseDataStore.expenseData?.data).tokenAddress
    return tokenSymbol(tokenAddress)
  } else {
    return ''
  }
})
const expenseDataRow = computed(() => ({
  expiryDate: expiry.value,
  maxAmountPerTx: maxLimitAmountPerTx.value,
  transactions: `${dynamicDisplayData(0).value.value}/${maxLimitTxsPerPeriod.value}`,
  amountTransferred: `${dynamicDisplayData(1).value.value}/${maxLimitAmountPerPeriod.value}`
}))
const expiry = computed(() => {
  if (expenseDataStore.expenseData?.data) {
    const unixEpoch = JSON.parse(expenseDataStore.expenseData?.data).expiry
    const date = new Date(Number(unixEpoch) * 1000)
    return date.toLocaleString('en-US')
  } else {
    return '--/--/--, --:--:--'
  }
})
const maxLimit = (budgetType: number) =>
  computed(() => {
    const budgetData =
      expenseDataStore.expenseData?.data &&
      Array.isArray(JSON.parse(expenseDataStore.expenseData?.data).budgetData)
        ? JSON.parse(expenseDataStore.expenseData?.data).budgetData.find(
            (item: BudgetData) => item.budgetType === budgetType
          )
        : undefined
    if (expenseDataStore.expenseData?.data && budgetData && budgetData.budgetType === budgetType)
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
      expenseDataStore.expenseData?.data &&
      amountWithdrawn.value &&
      Array.isArray(amountWithdrawn.value)
    ) {
      if (budgetType === 0) {
        return {
          ...data,
          value: Number(amountWithdrawn.value[0])
        }
      } else {
        const tokenAddress = JSON.parse(expenseDataStore.expenseData?.data).tokenAddress
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
  await getAmountWithdrawnBalance()
  await fetchUsdcBalance()
  await fetchExpenseAccountBalance()
  await initializeBalances()
}

const transferFromExpenseAccount = async (to: string, amount: string) => {
  tokenAmount.value = amount
  tokenRecipient.value = to

  if (
    expenseAccountEip712Address.value &&
    /*_expenseAccountData.value*/ expenseDataStore.expenseData.data
  ) {
    const budgetLimit: BudgetLimit = JSON.parse(
      /*_expenseAccountData.value*/ expenseDataStore.expenseData.data
    )

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
      /*_expenseAccountData.value*/ expenseDataStore.expenseData.signature
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
    !/*_expenseAccountData.value*/ expenseDataStore.expenseData?.data
  )
    return

  const tokenAddress = USDC_ADDRESS

  transferERC20loading.value = true
  const _amount = BigInt(Number(tokenAmount.value) * 1e6)

  const budgetLimit: BudgetLimit = JSON.parse(
    /*_expenseAccountData.value*/ expenseDataStore.expenseData.data
  )

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
          budgetData: budgetLimit.budgetData.map((item) => ({
            ...item,
            value: item.budgetType === 0 ? item.value : BigInt(Number(item.value) * 1e6) //parseEther(`${item.value}`)
          }))
        },
        /*_expenseAccountData.value*/ expenseDataStore.expenseData.signature
      ]
    })
  }
}

const getAmountWithdrawnBalance = async () => {
  if (expenseAccountEip712Address.value && expenseDataStore.expenseData?.data) {
    signatureHash.value = keccak256(expenseDataStore.expenseData.signature)
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
watch(
  () => expenseDataStore.expenseData,
  (newVal) => {
    if (newVal) {
      getAmountWithdrawnBalance()
    }
  }
)
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
    log.error('errorGetAmountWithdrawn.value:\n', parseError(newVal))
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
