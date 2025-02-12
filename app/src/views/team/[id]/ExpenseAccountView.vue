<template>
  <div class="flex flex-col gap-y-4">
    <!-- TODO move it to the top of the page when cash remuneration will have his own page -->
    <!-- Cash Remuneration stats: Only apear for owner -->
    <div class="flex gap-10">
      <div class="card bg-white w-1/3 shadow-xl">
        <div class="card-body">
          <h2 class="card-title">Balance</h2>
          <div
            class="font-extrabold text-neutral flex gap-2 items-baseline"
            data-test="expense-account-balance"
          >
            <span class="inline-block h-10 text-4xl">
              <span
                class="loading loading-spinner loading-lg"
                v-if="isLoadingExpenseAccountBalance"
              ></span>
              <span v-else>{{ expenseBalanceFormatted }} </span>
            </span>
            <span class="text-xs">{{ NETWORK.currencySymbol }}</span>
          </div>
          <div class="text-lg mt-2">
            <div v-if="isLoadingTokenBalances">
              <span class="loading loading-spinner loading-md"></span>
            </div>
            <div v-else>
              <div>USDC: {{ usdcBalance ? Number(usdcBalance) / 1e6 : '0' }}</div>
            </div>
          </div>
        </div>
      </div>
      <div class="card bg-blue-100 text-blue-800 w-1/3 shadow-xl">
        <div class="card-body">
          <div class="font-extrabold flex gap-2 items-baseline">
            <span class="inline-block h-10 text-4xl">
              <span class="loading loading-spinner loading-lg" v-if="false"></span>
              <span v-else>10 </span>
            </span>
            <span class="text-xs">{{ NETWORK.currencySymbol }}</span>
          </div>
          <h2 class="card-title">Spent this month</h2>
        </div>
      </div>
      <div class="card bg-orange-200 text-orange-800 w-1/3 shadow-xl">
        <div class="card-body">
          <h2 class="card-title">Approved Address</h2>
          <div class="font-extrabold flex gap-2 items-baseline">
            <span class="inline-block h-10 text-4xl">
              <span class="loading loading-spinner loading-lg" v-if="false"></span>
              <span v-else>20 </span>
            </span>
            <span class="text-xs">User</span>
          </div>
        </div>
      </div>
    </div>

    <div class="flex sm:flex-row justify-end sm:items-start gap-4 mb-10">
      <div class="flex flex-wrap gap-2 sm:gap-4" data-test="expense-account-address">
        <span class="text-sm">Expense Account Address </span>
        <AddressToolTip :address="team?.expenseAccountEip712Address ?? ''" class="text-xs" />
      </div>
    </div>
    <div
      v-if="team?.expenseAccountEip712Address"
      class="card shadow-xl bg-white flex text-primary-content p-5 overflow-visible"
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
        <ModalComponent v-model="approveUsersModal">
          <ApproveUsersForm
            v-if="approveUsersModal"
            :form-data="teamMembers"
            :users="foundUsers"
            :loading-approve="loadingApprove"
            :is-bod-action="isBodAction()"
            @approve-user="approveUser"
            @close-modal="approveUsersModal = false"
            @search-users="(input) => searchUsers(input)"
          />
        </ModalComponent>
      </section>
    </div>

    <!-- Activated List -->
    <!--<div
      v-if="manyExpenseAccountDataActive.length > 0 || manyExpenseAccountData"
      class="card bg-white shadow-xl flex flex-col justify-start text-primary-content border-outline p-5 overflow-visible"
    >
      <div class="flex flex-row justify-between mb-5">
        <span class="text-2xl font-bold">Approved Addresses</span>
        <ButtonUI
          variant="secondary"
          :disabled="!(currentUserAddress === contractOwnerAddress || isBodAction())"
          @click="
            () => {
              approveUsersModal = true
            }
          "
          data-test="approve-users-button"
        >
          Approve User Expense
        </ButtonUI>
      </div>
      <div class="overflow-x-auto" data-test="approvals-list-table">
        <table class="table">
          <!-- head
          <thead class="text-sm font-bold">
            <tr>
              <th>User</th>
              <th>Expiry Date</th>
              <th>Max Amount Per Tx</th>
              <th>Total Transactions</th>
              <th>Total Transfers</th>
              <th class="flex justify-end">Action</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(data, index) in manyExpenseAccountDataActive" :key="index">
              <td class="flex flex-row justify-start gap-4">
                <UserComponent
                  :user="{ name: data?.name, address: data?.approvedAddress }"
                ></UserComponent>
              </td>
              <td>{{ new Date(data?.expiry * 1000).toLocaleString('en-US') }}</td>
              <td>{{ data?.budgetData[2]?.value }} {{ tokenSymbol(data.tokenAddress) }}</td>
              <td>{{ `${data?.balances['0']}/${data?.budgetData[0]?.value}` }}</td>
              <td>{{ `${data?.balances['1']}/${data?.budgetData[1]?.value}` }}</td>
              <td class="flex justify-end" data-test="action-td">
                <ButtonUI
                  :disabled="contractOwnerAddress !== currentUserAddress"
                  variant="error"
                  outline
                  :loading="isLoadingDeactivateApproval && deactivateIndex === index"
                  @click="deactivateApproval(data.signature, index)"
                >
                  Disable Approval
                </ButtonUI>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>-->

    <!-- Deactivated List
    <div
      v-if="manyExpenseAccountDataInactive.length > 0"
      class="card bg-white shadow-xl flex flex-col justify-start text-primary-content border-outline p-5 overflow-visible"
    >
      <div class="flex flex-row justify-between mb-5">
        <span class="text-2xl font-bold">Deactivated Addresses</span>
      </div>
      <div class="overflow-x-auto" data-test="deactivated-list-table">
        <table class="table">
          <!-- head 
          <thead class="text-sm font-bold">
            <tr>
              <th>User</th>
              <th>Expiry Date</th>
              <th>Max Amount Per Tx</th>
              <th>Total Transactions</th>
              <th>Total Transfers</th>
              <th class="flex justify-end">Action</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(data, index) in manyExpenseAccountDataInactive" :key="index">
              <td class="flex flex-row justify-start gap-4">
                <UserComponent
                  :user="{ name: data.name, address: data.approvedAddress }"
                ></UserComponent>
              </td>
              <td>{{ new Date(data?.expiry * 1000).toLocaleString('en-US') }}</td>
              <td>{{ data?.budgetData[2]?.value }} {{ tokenSymbol(data.tokenAddress) }}</td>
              <td>{{ `${data?.balances['0']}/${data?.budgetData[0]?.value}` }}</td>
              <td>{{ `${data?.balances['1']}/${data?.budgetData[1]?.value}` }}</td>
              <td class="flex justify-end" data-test="action-td">
                <ButtonUI
                  :disabled="contractOwnerAddress !== currentUserAddress"
                  variant="success"
                  outline
                  :loading="isLoadingActivateApproval && deactivateIndex === index"
                  @click="activateApproval(data.signature, index)"
                >
                  Reactivate Approval
                </ButtonUI>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>-->

    <div class="overflow-x-auto flex flex-col gap-4" data-test="claims-table">
      <div class="flex flex-row justify-between mb-5">
        <span class="text-2xl font-bold">Approved Addresses</span>
        <ButtonUI
          variant="secondary"
          :disabled="!(currentUserAddress === contractOwnerAddress || isBodAction())"
          @click="
            () => {
              approveUsersModal = true
            }
          "
          data-test="approve-users-button"
        >
          Approve User Expense
        </ButtonUI>
      </div>
      <ExpenseAccountTable 
        :approvals="manyExpenseAccountDataAll"
        @disable-approval="(signature) => deactivateApproval(signature, 1)"
        @enable-approval="(signature) => activateApproval(signature, 1)"
      />
    </div>
  </div>
  <!-- Expense Account Not Yet Created -->
</template>

<script setup lang="ts">
//#region Imports
import { computed, onMounted, reactive, ref, watch } from 'vue'
import type {
  Team,
  User,
  BudgetLimit,
  BudgetData,
  ManyExpenseResponse,
  ManyExpenseWithBalances
} from '@/types'
import { NETWORK, USDC_ADDRESS, USDT_ADDRESS } from '@/constant'
import TransferFromBankForm from '@/components/forms/TransferFromBankForm.vue'
import ModalComponent from '@/components/ModalComponent.vue'
import ApproveUsersForm from '@/components/forms/ApproveUsersEIP712Form.vue'
import AddressToolTip from '@/components/AddressToolTip.vue'
import ExpenseAccountTable from '@/components/sections/ExpenseAccountView/ExpenseAccountTable.vue'
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
import UserComponent from '@/components/UserComponent.vue'
import ERC20ABI from '@/artifacts/abi/erc20.json'
import { readContract } from '@wagmi/core'
import { config } from '@/wagmi.config'
import { useRoute } from 'vue-router'
//#endregion

//#region Refs
const route = useRoute()
const transferModal = ref(false)
const approveUsersModal = ref(false)
const foundUsers = ref<User[]>([])
const searchUserName = ref('')
const searchUserAddress = ref('')
const teamMembers = ref([{ name: '', address: '', isValid: false }])
const loadingApprove = ref(false)
// Token related refs
const tokenAmount = ref('')
const tokenRecipient = ref('')
const isLoadingTokenBalances = computed(() => isLoadingUsdcBalance.value)
const expenseAccountData = ref<{}>()
const signatureHash = ref<string | null>(null)
const deactivateIndex = ref<number | null>(null)
const expenseAccountEip712Address = computed(
  () => team.value?.expenseAccountEip712Address as Address
)
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

const expiry = computed(() => {
  if (_expenseAccountData.value?.data) {
    const unixEpoch = JSON.parse(_expenseAccountData.value.data).expiry
    const date = new Date(Number(unixEpoch) * 1000)
    return date.toLocaleString('en-US')
  } else {
    return '--/--/--, --:--:--'
  }
})
const tokenSymbol = (tokenAddress: string) =>
  computed(() => {
    const symbols = {
      [USDC_ADDRESS]: 'USDC',
      [USDT_ADDRESS]: 'USDT',
      [zeroAddress]: NETWORK.currencySymbol
    }

    return symbols[tokenAddress] || ''
  })
const dynamicDisplayData = (budgetType: number) =>
  computed(() => {
    const data =
      budgetType === 0
        ? { heading: 'Total Transactions', symbol: 'TXs' }
        : { heading: 'Total Withdrawn', symbol: NETWORK.currencySymbol }
    if (_expenseAccountData.value?.data && amountWithdrawn.value) {
      if (budgetType === 0) {
        return {
          ...data,
          // @ts-expect-error: amountWithdrawn.value is a array
          value: Number(amountWithdrawn.value[0])
        }
      } else {
        const tokenAddress = JSON.parse(_expenseAccountData.value.data).tokenAddress
        return {
          ...data,
          value:
            tokenAddress === zeroAddress
              ? // @ts-expect-error: amountWithdrawn.value is a array
                formatEther(amountWithdrawn.value[1])
              : // @ts-expect-error: amountWithdrawn.value is a array
                Number(amountWithdrawn.value[1]) / 1e6
        }
      }
    } else {
      return {
        ...data,
        value: `--`
      }
    }
  })
const expenseBalanceFormatted = computed(() => {
  if (typeof expenseAccountBalance.value?.value === 'bigint')
    return formatEther(expenseAccountBalance.value.value)
  else return '--'
})
const dynamicDisplayDataTx = dynamicDisplayData(0)
const dynamicDisplayDataAmount = dynamicDisplayData(1)
// Reactive storage for balances
// const manyExpenseAccountDataActive = reactive<ManyExpenseWithBalances[]>([])
// const manyExpenseAccountDataInactive = reactive<ManyExpenseWithBalances[]>([])
const manyExpenseAccountDataAll = reactive<ManyExpenseWithBalances[]>([])

// Check if the current user is disapproved
const isDisapprovedAddress = computed(
  () =>
    manyExpenseAccountDataAll.findIndex(
      (item) => item.approvedAddress === currentUserAddress && item.status === 'disabled'
    ) !== -1
)
//#endregion

//#region useCustomFetch
const {
  data: team,
  // error: teamError,
  execute: executeFetchTeam
} = useCustomFetch(`teams/${String(route.params.id)}`)
  .get()
  .json<Team>()

const {
  error: fetchExpenseAccountDataError,
  // isFetching: isFetchingExpenseAccountData,
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
  error: fetchManyExpenseAccountDataError,
  //isFetching: isFetchingManyExpenseAccountData,
  execute: fetchManyExpenseAccountData,
  data: manyExpenseAccountData
} = useCustomFetch(`teams/${String(route.params.id)}/expense-data`, {
  immediate: false
})
  .get()
  .json<ManyExpenseResponse[]>()

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

const { execute: executeAddExpenseData } = useCustomFetch(`teams/${route.params.id}/expense-data`, {
  immediate: false
})
  .post(expenseAccountData)
  .json()
//#endregion

//#region Composables
const currentUserAddress = useUserDataStore().address
const { addErrorToast, addSuccessToast } = useToastStore()
const { signTypedData, data: signature, error: signTypedDataError } = useSignTypedData()
const chainId = useChainId()
const {
  data: contractOwnerAddress,
  refetch: executeExpenseAccountGetOwner,
  error: errorGetOwner
} = useReadContract({
  functionName: 'owner',
  address: expenseAccountEip712Address as unknown as Address,
  abi: expenseAccountABI
})

const {
  data: expenseAccountBalance,
  isLoading: isLoadingExpenseAccountBalance,
  error: isErrorExpenseAccountBalance,
  refetch: executeGetExpenseAccountBalance
} = useBalance({
  address: expenseAccountEip712Address as unknown as Address, // teamStore.currentTeam?.expenseAccountEip712Address as Address,
  chainId
})

// Token balances
const {
  data: usdcBalance,
  isLoading: isLoadingUsdcBalance,
  refetch: fetchUsdcBalance,
  error: usdcBalanceError
} = useReadContract({
  address: USDC_ADDRESS as Address,
  abi: ERC20ABI,
  functionName: 'balanceOf',
  args: [expenseAccountEip712Address as unknown as Address]
})

const {
  data: amountWithdrawn,
  refetch: executeGetAmountWithdrawn,
  error: errorGetAmountWithdrawn
  //isLoading: isLoadingGetAmountWithdrawn
} = useReadContract({
  functionName: 'balances',
  address: expenseAccountEip712Address as unknown as Address,
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

//deactivate approval
const {
  writeContract: executeDeactivateApproval,
  isPending: isLoadingDeactivateApproval,
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
  isPending: isLoadingActivateApproval,
  error: errorActivateApproval,
  data: activateHash
} = useWriteContract()

const { isLoading: isConfirmingActivate, isSuccess: isConfirmedActivate } =
  useWaitForTransactionReceipt({
    hash: activateHash
  })

// Token approval
const {
  writeContract: approve,
  error: approveError,
  data: approveHash
  // isPending: isPendingApprove
} = useWriteContract()

const { isLoading: isConfirmingApprove, isSuccess: isConfirmedApprove } =
  useWaitForTransactionReceipt({
    hash: approveHash
  })
//#endregion

//#region Functions
// Async initialization function
const initializeBalances = async () => {
  // manyExpenseAccountDataActive.length = 0
  // manyExpenseAccountDataInactive.length = 0
  manyExpenseAccountDataAll.length = 0
  if (Array.isArray(manyExpenseAccountData.value))
    for (const data of manyExpenseAccountData.value) {
      signatureHash.value = keccak256(data.signature)

      await executeGetAmountWithdrawn()

      const isExpired = data.expiry <= Math.floor(new Date().getTime() / 1000)

      // Populate the reactive balances object
      if (Array.isArray(amountWithdrawn.value)) {
        // New algo
        manyExpenseAccountDataAll.push({
            ...data,
            balances: {
              0: `${amountWithdrawn.value[0]}`,
              1:
                data.tokenAddress === zeroAddress
                  ? formatEther(amountWithdrawn.value[1])
                  : `${Number(amountWithdrawn.value[1]) / 1e6}`,
              2: amountWithdrawn.value[2] === true
            },
            status: isExpired
              ? 'expired'
              : amountWithdrawn.value[2] === 2
                ? 'disabled'
                : 'enabled'
          })
        // Old algo
        /*if (amountWithdrawn.value[2] === 2) {
          manyExpenseAccountDataInactive.push({
            ...data,
            balances: {
              0: `${amountWithdrawn.value[0]}`,
              1:
                data.tokenAddress === zeroAddress
                  ? formatEther(amountWithdrawn.value[1])
                  : `${Number(amountWithdrawn.value[1]) / 1e6}`,
              2: amountWithdrawn.value[2] === true
            }
          })
        } else
          manyExpenseAccountDataActive.push({
            ...data,
            balances: {
              0: `${amountWithdrawn.value[0]}`,
              1:
                data.tokenAddress === zeroAddress
                  ? formatEther(amountWithdrawn.value[1])
                  : `${Number(amountWithdrawn.value[1]) / 1e6}`,
              2: amountWithdrawn.value[2] === false
            }
          })*/
      } else {
        manyExpenseAccountDataAll.push({
          ...data,
          balances: {
            0: '--',
            1: '--',
            2: false
          },
          status: 'disabled'
        })
      }
    }
}

const init = async () => {
  await getExpenseAccountOwner()
  await fetchExpenseAccountData()
  await fetchManyExpenseAccountData()
  await initializeBalances()
  await executeFetchTeam()
  await getAmountWithdrawnBalance()
  await fetchUsdcBalance()
}

const deactivateApproval = async (signature: `0x{string}`, index: number) => {
  deactivateIndex.value = index
  const signatureHash = keccak256(signature)

  executeDeactivateApproval({
    address: team.value?.expenseAccountEip712Address as Address,
    args: [signatureHash],
    abi: expenseAccountABI,
    functionName: 'deactivateApproval'
  })
}

const activateApproval = async (signature: `0x{string}`, index: number) => {
  deactivateIndex.value = index
  const signatureHash = keccak256(signature)

  executeActivateApproval({
    address: team.value?.expenseAccountEip712Address as Address,
    args: [signatureHash],
    abi: expenseAccountABI,
    functionName: 'activateApproval'
  })
}

const getExpenseAccountOwner = async () => {
  if (team.value?.expenseAccountEip712Address) await executeExpenseAccountGetOwner()
}

const getAmountWithdrawnBalance = async () => {
  if (team.value?.expenseAccountEip712Address) {
    if (!_expenseAccountData?.value?.data) return
    signatureHash.value = keccak256(_expenseAccountData.value.signature)
    await executeGetAmountWithdrawn()
  }
}

const transferFromExpenseAccount = async (to: string, amount: string) => {
  tokenAmount.value = amount
  tokenRecipient.value = to

  if (team.value?.expenseAccountEip712Address && _expenseAccountData.value.data) {
    const budgetLimit: BudgetLimit = JSON.parse(_expenseAccountData.value.data)

    if (budgetLimit.tokenAddress === zeroAddress) transferNativeToken(to, amount, budgetLimit)
    else await transferErc20Token()
  }
}

const transferNativeToken = (to: string, amount: string, budgetLimit: BudgetLimit) => {
  executeExpenseAccountTransfer({
    address: team.value?.expenseAccountEip712Address as Address,
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
    !team.value?.expenseAccountEip712Address ||
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
    args: [currentUserAddress as Address, team.value.expenseAccountEip712Address as Address]
  })

  const currentAllowance = allowance ? allowance.toString() : 0n
  if (Number(currentAllowance) < Number(_amount)) {
    approve({
      address: tokenAddress as Address,
      abi: ERC20ABI,
      functionName: 'approve',
      args: [team.value.expenseAccountEip712Address as Address, _amount]
    })
  } else {
    executeExpenseAccountTransfer({
      address: team.value.expenseAccountEip712Address as Address,
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

const approveUser = async (data: BudgetLimit) => {
  loadingApprove.value = true
  expenseAccountData.value = data
  const verifyingContract = team.value?.expenseAccountEip712Address

  const domain = {
    name: 'CNCExpenseAccount',
    version: '1',
    chainId: chainId.value,
    verifyingContract: verifyingContract as Address
  }
  const types = {
    BudgetData: [
      { name: 'budgetType', type: 'uint8' },
      { name: 'value', type: 'uint256' } //,
      //{ name: 'token', type: 'address' }
    ],
    BudgetLimit: [
      { name: 'approvedAddress', type: 'address' },
      { name: 'budgetData', type: 'BudgetData[]' },
      { name: 'expiry', type: 'uint256' },
      { name: 'tokenAddress', type: 'address' }
    ]
  }

  const message = {
    ...data,
    budgetData: data.budgetData?.map((item) => ({
      ...item,
      value:
        item.budgetType === 0
          ? item.value
          : data.tokenAddress === zeroAddress
            ? parseEther(`${item.value}`)
            : BigInt(Number(item.value) * 1e6)
    }))
  }

  signTypedData({
    types,
    primaryType: 'BudgetLimit',
    message,
    domain
  })
}

const isBodAction = () => {
  return false
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

const errorMessage = (error: {}, message: string) =>
  'reason' in error ? (error.reason as string) : message
//#endregion

//#region Watch
watch(
  () => team.value?.expenseAccountAddress,
  async (newVal) => {
    if (newVal) await init()
  }
)

watch(isConfirmingTransfer, async (isConfirming, wasConfirming) => {
  if (!isConfirming && wasConfirming && isConfirmedTransfer.value) {
    addSuccessToast('Transfer Successful')
    await executeGetExpenseAccountBalance()
    await fetchUsdcBalance()
    await getAmountWithdrawnBalance()
    transferModal.value = false
  }
})

watch(isConfirmingActivate, async (isConfirming, wasConfirming) => {
  if (!isConfirming && wasConfirming && isConfirmedActivate.value) {
    addSuccessToast('Activate Successful')
    await initializeBalances()
  }
})

watch(isConfirmingDeactivate, async (isConfirming, wasConfirming) => {
  if (!isConfirming && wasConfirming && isConfirmedDeactivate.value) {
    addSuccessToast('Deactivate Successful')
    await initializeBalances()
  }
})

watch(signature, async (newVal) => {
  if (newVal && expenseAccountData.value) {
    expenseAccountData.value = {
      expenseAccountData: expenseAccountData.value,
      signature
    }
    await executeAddExpenseData()
    await init()
    loadingApprove.value = false
    approveUsersModal.value = false
  }
})

watch(searchUserResponse, () => {
  if (searchUserResponse.value?.ok && users.value?.users) {
    foundUsers.value = users.value.users
  }
})

watch(errorGetOwner, (newVal) => {
  if (newVal) addErrorToast(errorMessage(newVal, 'Error Getting Contract Owner'))
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

watch(signTypedDataError, async (newVal) => {
  if (newVal) {
    addErrorToast('Error signing expense data')
    log.error('signTypedDataError.value', parseError(newVal))
    loadingApprove.value = false
  }
})

watch(fetchManyExpenseAccountDataError, (newVal) => {
  if (newVal) {
    addErrorToast('Error fetching many expense account data')
    log.error(parseError(newVal))
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
