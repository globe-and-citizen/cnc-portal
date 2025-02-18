<template>
  <div
      v-if="team?.expenseAccountEip712Address"
      class="card shadow-xl bg-white flex text-primary-content p-5 overflow-visible mb-10"
    >
      <span class="text-2xl font-bold">My Approved Expense</span>
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
          <TransferFromBankForm
            v-if="transferModal && _expenseAccountData?.data"
            @close-modal="() => (transferModal = false)"
            @transfer="
              async (to: string, amount: string) => {
                await transferFromExpenseAccount(to, amount)
              }
            "
            @searchMembers="(input) => searchUsers({ name: '', address: input })"
            :filteredMembers="foundUsers"
            :loading="isLoadingTransfer || isConfirmingTransfer"
            :bank-balance="
              JSON.parse(_expenseAccountData?.data)?.tokenAddress === zeroAddress
                ? expenseBalanceFormatted
                : `${Number(usdcBalance) / 1e6}`
            "
            :token-symbol="tokenSymbol(JSON.parse(_expenseAccountData?.data)?.tokenAddress).value"
            service="Expense Account"
          />
        </ModalComponent>
      </section>
    </div>
</template>

<script setup lang="ts">
//#region Imports
import { computed, type ComputedRef, onMounted, reactive, type Ref, ref, watch } from 'vue'
import type {
  Team,
  User,
  BudgetLimit,
  BudgetData
} from '@/types'
import { NETWORK, USDC_ADDRESS, USDT_ADDRESS } from '@/constant'
import TransferFromBankForm from '@/components/forms/TransferFromBankForm.vue'
import ModalComponent from '@/components/ModalComponent.vue'
import { useUserDataStore, useToastStore } from '@/stores'
import { useCustomFetch } from '@/composables/useCustomFetch'
import { parseError, log } from '@/utils'
import {
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  useBalance,
  useChainId,
  useSignTypedData
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
  tokenSymbol: (tokenAddress: string) => ComputedRef<string>
  team: Partial<Team>
  expenseBalanceFormatted: string
  usdcBalance: unknown
  isDisapprovedAddress: boolean
}>()

//#region refs
const transferModal = ref(false)
const foundUsers = ref<User[]>([])
const searchUserName = ref('')
const searchUserAddress = ref('')
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
    if (_expenseAccountData.value?.data && amountWithdrawn.value && Array.isArray(amountWithdrawn.value)) {
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
const tokenAmount = ref('')
const tokenRecipient = ref('')
const signatureHash = ref<string | null>(null)
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

const {
  execute: executeSearchUser,
  response: searchUserResponse,
  data: users
} = useCustomFetch('user/search', {
  immediate: false,
  beforeFetch: async ({ options, url, cancel }) => {
    const params = new URLSearchParams()
    if (!searchUserName.value && !searchUserAddress.value) return
    if (searchUserName.value) params.append('name', searchUserName.value)
    if (searchUserAddress.value) params.append('address', searchUserAddress.value)
    url += '?' + params.toString()
    return { options, url, cancel }
  }
})
  .get()
  .json()
//#endregion

//#region composables
const { addErrorToast, addSuccessToast } = useToastStore()
const {
  data: amountWithdrawn,
  refetch: executeGetAmountWithdrawn,
  error: errorGetAmountWithdrawn
} = useReadContract({
  functionName: 'balances',
  address: team.expenseAccountEip712Address as unknown as Address,
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
const {
  writeContract: approve,
  error: approveError,
  data: approveHash
} = useWriteContract()

const { isLoading: isConfirmingApprove, isSuccess: isConfirmedApprove } =
  useWaitForTransactionReceipt({
    hash: approveHash
  })
//#endregion 

//#region functions
const init = async () => {
  await fetchExpenseAccountData()
  await getAmountWithdrawnBalance()
}
const searchUsers = async (input: { name: string; address: string }) => {
  try {
    searchUserName.value = input.name
    searchUserAddress.value = input.address
    if (searchUserName.value || searchUserAddress.value) {
      await executeSearchUser()
    }
  } catch (error) {
    addErrorToast(parseError(error))
  }
}
const transferFromExpenseAccount = async (to: string, amount: string) => {
  tokenAmount.value = amount
  tokenRecipient.value = to

  if (team.expenseAccountEip712Address && _expenseAccountData.value.data) {
    const budgetLimit: BudgetLimit = JSON.parse(_expenseAccountData.value.data)

    if (budgetLimit.tokenAddress === zeroAddress) transferNativeToken(to, amount, budgetLimit)
    else await transferErc20Token()
  }
}

const transferNativeToken = (to: string, amount: string, budgetLimit: BudgetLimit) => {
  executeExpenseAccountTransfer({
    address: team.expenseAccountEip712Address as Address,
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

// Token transfer function
const transferErc20Token = async () => {
  if (
    !team.expenseAccountEip712Address ||
    !tokenAmount.value ||
    !tokenRecipient.value ||
    !_expenseAccountData.value?.data
  )
    return

  const tokenAddress = USDC_ADDRESS
  const _amount = BigInt(Number(tokenAmount.value) * 1e6)

  const budgetLimit: BudgetLimit = JSON.parse(_expenseAccountData.value.data)

  const allowance = await readContract(config, {
    address: tokenAddress as Address,
    abi: ERC20ABI,
    functionName: 'allowance',
    args: [currentUserAddress as Address, team.expenseAccountEip712Address as Address]
  })

  const currentAllowance = allowance ? allowance.toString() : 0n
  if (Number(currentAllowance) < Number(_amount)) {
    approve({
      address: tokenAddress as Address,
      abi: ERC20ABI,
      functionName: 'approve',
      args: [team.expenseAccountEip712Address as Address, _amount]
    })
  } else {
    executeExpenseAccountTransfer({
      address: team.expenseAccountEip712Address as Address,
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
  if (team.expenseAccountEip712Address) {
    if (!_expenseAccountData?.value?.data) return
    signatureHash.value = keccak256(_expenseAccountData.value.signature)
    await executeGetAmountWithdrawn()
  }
}
//#endregion

//#region watch
watch(searchUserResponse, () => {
  if (searchUserResponse.value?.ok && users.value?.users) {
    foundUsers.value = users.value.users
  }
})
watch(isConfirmingTransfer, async (isConfirming, wasConfirming) => {
  if (!isConfirming && wasConfirming && isConfirmedTransfer.value) {
    addSuccessToast('Transfer Successful')
    // await executeGetExpenseAccountBalance()
    // await fetchUsdcBalance()
    await getAmountWithdrawnBalance()
    transferModal.value = false
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
    transferErc20Token()
  }
})
watch(approveError, () => {
  if (approveError.value) {
    log.error(parseError(approveError.value))
    addErrorToast('Failed to approve token spending')
  }
})
watch(fetchExpenseAccountDataError, (newVal) => {
  if (newVal) addErrorToast('Error fetching expense account data')
})
//#endregion

onMounted(async () => {
  await init()
})
</script>