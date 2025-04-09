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
        <template #expiryDate="{ row }">
          <span>{{ row.expiryDate }}</span>
        </template>
        <template #maxAmountPerTx="{ row }">
          <span> {{ row.maxAmountPerTx }} {{ row.tokenSymbol }} </span>
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
          v-if="transferModal && expenseDataStore.myApprovedExpenses"
          v-model="transferData"
          :tokens="[
            {
              symbol: tokenSymbol(
                expenseDataStore.myApprovedExpenses.find(
                  (item: ManyExpenseResponse) => item.signature === signatureToTransfer
                )?.tokenAddress
              ),
              balance:
                expenseDataStore.myApprovedExpenses.find(
                  (item: ManyExpenseResponse) => item.signature === signatureToTransfer
                )?.tokenAddress === zeroAddress
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
import type { BudgetLimit, BudgetData, ManyExpenseResponse, ManyExpenseWithBalances } from '@/types'
import { USDC_ADDRESS } from '@/constant'
import CardComponent from '@/components/CardComponent.vue'
import TransferForm from '@/components/forms/TransferForm.vue'
import ModalComponent from '@/components/ModalComponent.vue'
import { useUserDataStore, useToastStore, useTeamStore, useExpenseDataStore } from '@/stores'
import { parseError, log, tokenSymbol, formatEtherUtil } from '@/utils'
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
import TableComponent, { type TableColumn } from '@/components/TableComponent.vue'
import { useRoute } from 'vue-router'
import { asyncComputed } from '@vueuse/core'
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
const signatureToTransfer = ref('')
const transferData = ref({
  address: { name: '', address: '' },
  token: { symbol: '', balance: '0' },
  amount: '0'
})
const isDisapprovedAddress = computed(
  () =>
    expenseDataStore.allExpenseDataParsed.findIndex(
      (item: ManyExpenseWithBalances) =>
        item.approvedAddress === currentUserAddress &&
        (item.status === 'disabled' || item.status === 'expired')
    ) !== -1
)
//#endregion

const teamStore = useTeamStore()
const currentUserAddress = useUserDataStore().address
const expenseDataStore = useExpenseDataStore()
const route = useRoute()

//#region Computed Values
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

const myApprovedExpenseRows = asyncComputed(async () => {
  if (!expenseDataStore.myApprovedExpenses)
    return [
      {
        expiryDate: '--/--/--, --:--:--',
        maxAmountPerTx: '--',
        transactions: `--`,
        amountTransferred: `--`
      }
    ]
  return await Promise.all(
    expenseDataStore.myApprovedExpenses.map(async (item: ManyExpenseResponse) => {
      const amountWithdrawn = await readContract(config, {
        functionName: 'balances',
        address: expenseAccountEip712Address.value,
        abi: expenseAccountABI,
        args: [keccak256(item.signature)]
      })

      return Array.isArray(amountWithdrawn)
        ? {
            expiryDate: new Date(Number(item.expiry) * 1000).toLocaleString('en-US'),
            maxAmountPerTx: `${item.budgetData[2].value} ${tokenSymbol(item.tokenAddress)}`,
            transactions: `${amountWithdrawn[0]}/${item.budgetData[0].value}`,
            amountTransferred: `${formatEtherUtil(amountWithdrawn[1], item.tokenAddress)}/${item.budgetData[1].value}`,
            signature: item.signature,
            tokenSymbol: tokenSymbol(item.tokenAddress)
          }
        : {
            expiryDate: '--/--/--, --:--:--',
            maxAmountPerTx: '--',
            transactions: `--`,
            amountTransferred: `--`
          }
    })
  )
})
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
  await fetchUsdcBalance()
  await fetchExpenseAccountBalance()
}

const transferFromExpenseAccount = async (to: string, amount: string) => {
  tokenAmount.value = amount
  tokenRecipient.value = to

  const budgetLimit = expenseDataStore.myApprovedExpenses.find(
    (item: ManyExpenseResponse) => item.signature === signatureToTransfer.value
  )

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
    (item: ManyExpenseResponse) => item.signature === signatureToTransfer.value
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
          budgetData: budgetLimit.budgetData.map((item: BudgetData) => ({
            ...item,
            value: item.budgetType === 0 ? item.value : BigInt(Number(item.value) * 1e6) //parseEther(`${item.value}`)
          }))
        },
        signatureToTransfer.value
      ]
    })
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
    addSuccessToast('Transfer Successful')
    await init()
    transferModal.value = false
    transferERC20loading.value = false
    await expenseDataStore.fetchAllExpenseData(
      Array.isArray(route.params.id) ? route.params.id[0] : route.params.id
    )
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
