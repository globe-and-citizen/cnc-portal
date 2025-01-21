<template>
  <div class="flex flex-col gap-y-4">
    <!-- TODO move it to the top of the page when cash remuneration will have his own page -->
    <!-- Cash Remuneration stats: Only apear for owner -->
    <div class="flex gap-10">
      <div class="card bg-base-200 w-1/3 shadow-xl">
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
        <AddressToolTip :address="team.expenseAccountEip712Address ?? ''" class="text-xs" />
      </div>
    </div>
    <div
      v-if="team.expenseAccountEip712Address"
      class="card shadow-xl flex text-primary-content p-5 overflow-visible"
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
                  <td>{{ `${maxLimitAmountPerTx} ${NETWORK.currencySymbol}` }}</td>
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
                    <ButtonUI
                      variant="success"
                      :disabled="!_expenseAccountData?.data || isDisapprovedAddress"
                      @click="tokenTransferModal = true"
                      data-test="token-transfer-button"
                    >
                      Transfer Token
                    </ButtonUI>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <ModalComponent v-model="transferModal">
          <TransferFromBankForm
            v-if="transferModal"
            @close-modal="() => (transferModal = false)"
            @transfer="
              async (to: string, amount: string) => {
                await transferFromExpenseAccount(to, amount)
              }
            "
            @searchMembers="(input) => searchUsers({ name: '', address: input })"
            :filteredMembers="foundUsers"
            :loading="isLoadingTransfer || isConfirmingTransfer"
            :bank-balance="`${'0.0'}`"
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
    <div
      v-if="manyExpenseAccountDataActive.length > 0 || manyExpenseAccountData"
      class="card shadow-xl flex flex-col justify-start text-primary-content border-outline p-5 overflow-visible"
    >
      <div class="flex flex-row justify-between mb-5">
        <span class="text-2xl font-bold">Approved Addresses</span>
        <ButtonUI
          variant="secondary"
          :disabled="!(currentUserAddress === contractOwnerAddress || isBodAction())"
          @click="
            () => {
              approveUsersModal = true
              console.log('approveUsersModal', approveUsersModal)
            }
          "
          data-test="approve-users-button"
        >
          Approve User Expense
        </ButtonUI>
      </div>
      <div class="overflow-x-auto" data-test="approvals-list-table">
        <table class="table">
          <!-- head -->
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
              <td>{{ data?.budgetData[2]?.value }}</td>
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
    </div>

    <!-- Deactivated List -->
    <div
      v-if="manyExpenseAccountDataInactive.length > 0"
      class="card shadow-xl flex flex-col justify-start text-primary-content border-outline p-5 overflow-visible"
    >
      <div class="flex flex-row justify-between mb-5">
        <span class="text-2xl font-bold">Deactivated Addresses</span>
      </div>
      <div class="overflow-x-auto" data-test="deactivated-list-table">
        <table class="table">
          <!-- head -->
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
              <td>{{ data?.budgetData[2]?.value }}</td>
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
    </div>
  </div>
  <!-- Expense Account Not Yet Created -->

  <ModalComponent v-model="tokenTransferModal" data-test="token-transfer-modal">
    <div class="flex flex-col gap-4 justify-start">
      <span class="font-bold text-xl sm:text-2xl">Transfer Token</span>
      <div class="form-control w-full">
        <label class="label">
          <span class="label-text">Token</span>
        </label>
        <select v-model="selectedToken" class="select select-bordered w-full">
          <option value="USDC">USDC</option>
        </select>
      </div>
      <div class="form-control w-full">
        <label class="label">
          <span class="label-text">To Address</span>
        </label>
        <input
          type="text"
          class="input input-bordered w-full"
          placeholder="Enter recipient address"
          v-model="tokenRecipient"
        />
      </div>
      <div class="form-control w-full">
        <label class="label">
          <span class="label-text">Amount</span>
        </label>
        <input
          type="number"
          class="input input-bordered w-full"
          placeholder="Enter amount"
          v-model="tokenAmount"
        />
      </div>
      <div class="text-center">
        <ButtonUI
          :loading="
            isLoadingTokenTransfer ||
            isConfirmingTokenTransfer ||
            isPendingApprove ||
            isConfirmingApprove
          "
          :disabled="
            isLoadingTokenTransfer ||
            isConfirmingTokenTransfer ||
            isPendingApprove ||
            isConfirmingApprove
          "
          class="w-full sm:w-44"
          variant="primary"
          @click="transferToken"
          data-test="transfer-token-button"
        >
          Transfer Token
        </ButtonUI>
      </div>
    </div>
  </ModalComponent>
</template>

<script setup lang="ts">
//#region imports
import { computed, onMounted, reactive, ref, watch } from 'vue'
import type {
  Team,
  User,
  BudgetLimit,
  BudgetData,
  ManyExpenseResponse,
  ManyExpenseWithBalances
} from '@/types'
import { NETWORK } from '@/constant'
import TransferFromBankForm from '@/components/forms/TransferFromBankForm.vue'
import ModalComponent from '@/components/ModalComponent.vue'
import ApproveUsersForm from './forms/ApproveUsersEIP712Form.vue'
import AddressToolTip from '@/components/AddressToolTip.vue'
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
import { type Address, formatEther, parseEther, keccak256 } from 'viem'
import ButtonUI from '@/components/ButtonUI.vue'
import UserComponent from '@/components/UserComponent.vue'
import { USDC_ADDRESS } from '@/constant'
import ERC20ABI from '@/artifacts/abi/erc20.json'
import { readContract } from '@wagmi/core'
import { config } from '@/wagmi.config'
//#endregion imports

//#region variable declarations
const currentUserAddress = useUserDataStore().address
const props = defineProps<{ team: Partial<Team> }>()
const emits = defineEmits(['getTeam'])
const team = ref(props.team)
const transferModal = ref(false)
const approveUsersModal = ref(false)
const foundUsers = ref<User[]>([])
const searchUserName = ref('')
const searchUserAddress = ref('')
const teamMembers = ref([{ name: '', address: '', isValid: false }])
const loadingApprove = ref(false)
const expenseAccountData = ref<{}>()
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
        return {
          ...data,
          // @ts-expect-error: amountWithdrawn.value is a array
          value: formatEther(amountWithdrawn.value[1])
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
const { addErrorToast, addSuccessToast } = useToastStore()
const expenseBalanceFormatted = computed(() => {
  if (typeof expenseAccountBalance.value?.value === 'bigint')
    return formatEther(expenseAccountBalance.value.value)
  else return '--'
})
const signatureHash = ref<string | null>(null)
const deactivateIndex = ref<number | null>(null)
//#endregion variable declarations

//#region expense account composable
const {
  data: contractOwnerAddress,
  refetch: executeExpenseAccountGetOwner,
  error: errorGetOwner
} = useReadContract({
  functionName: 'owner',
  address: team.value.expenseAccountEip712Address as Address,
  abi: expenseAccountABI
})

const {
  data: amountWithdrawn,
  refetch: executeGetAmountWithdrawn,
  error: errorGetAmountWithdrawn
  //isLoading: isLoadingGetAmountWithdrawn
} = useReadContract({
  functionName: 'balances',
  address: team.value.expenseAccountEip712Address as Address,
  abi: expenseAccountABI,
  args: [signatureHash]
})

// Reactive storage for balances
const manyExpenseAccountDataActive = reactive<ManyExpenseWithBalances[]>([])
const manyExpenseAccountDataInactive = reactive<ManyExpenseWithBalances[]>([])

// Check if the current user is disapproved
const isDisapprovedAddress = computed(
  () =>
    manyExpenseAccountDataInactive.findIndex(
      (item) => item.approvedAddress === currentUserAddress
    ) !== -1
)

// Async initialization function
const initializeBalances = async () => {
  manyExpenseAccountDataActive.length = 0
  manyExpenseAccountDataInactive.length = 0
  if (Array.isArray(manyExpenseAccountData.value))
    for (const data of manyExpenseAccountData.value) {
      signatureHash.value = keccak256(data.signature)

      await executeGetAmountWithdrawn()

      // Populate the reactive balances object
      if (Array.isArray(amountWithdrawn.value)) {
        if (amountWithdrawn.value[2] === 2)
          manyExpenseAccountDataInactive.push({
            ...data,
            balances: {
              0: `${amountWithdrawn.value[0]}`,
              1: formatEther(amountWithdrawn.value[1]),
              2: amountWithdrawn.value[2] === true
            }
          })
        else
          manyExpenseAccountDataActive.push({
            ...data,
            balances: {
              0: `${amountWithdrawn.value[0]}`,
              1: formatEther(amountWithdrawn.value[1]),
              2: amountWithdrawn.value[2] === false
            }
          })
      } else {
        manyExpenseAccountDataInactive.push({
          ...data,
          balances: {
            0: '--',
            1: '--',
            2: false
          }
        })
      }
    }
}

watch(errorGetAmountWithdrawn, (newVal) => {
  if (newVal) {
    log.error(parseError(newVal))
    addErrorToast('Failed to fetch amount withdrawn')
  }
})

//expense account transfer
const {
  writeContract: executeExpenseAccountTransfer,
  isPending: isLoadingTransfer,
  error: errorTransfer,
  data: transferHash
} = useWriteContract()

watch(errorTransfer, (newVal) => {
  if (newVal) {
    log.error(parseError(newVal))
    addErrorToast('Failed to transfer')
  }
})

const { isLoading: isConfirmingTransfer, isSuccess: isConfirmedTransfer } =
  useWaitForTransactionReceipt({
    hash: transferHash
  })
watch(isConfirmingTransfer, async (isConfirming, wasConfirming) => {
  if (!isConfirming && wasConfirming && isConfirmedTransfer.value) {
    addSuccessToast('Transfer Successful')
    await executeGetExpenseAccountBalance()
    await getAmountWithdrawnBalance()
    transferModal.value = false
  }
})

//deactivate approval
const {
  writeContract: executeDeactivateApproval,
  isPending: isLoadingDeactivateApproval,
  error: errorDeactivateApproval,
  data: deactivateHash
} = useWriteContract()

watch(errorDeactivateApproval, (newVal) => {
  if (newVal) {
    log.error(parseError(newVal))
    addErrorToast('Failed to deactivate approval')
  }
})

const { isLoading: isConfirmingDeactivate, isSuccess: isConfirmedDeactivate } =
  useWaitForTransactionReceipt({
    hash: deactivateHash
  })
watch(isConfirmingDeactivate, async (isConfirming, wasConfirming) => {
  if (!isConfirming && wasConfirming && isConfirmedDeactivate.value) {
    addSuccessToast('Deactivate Successful')
    await initializeBalances()
  }
})

const deactivateApproval = async (signature: `0x{string}`, index: number) => {
  deactivateIndex.value = index
  const signatureHash = keccak256(signature)

  executeDeactivateApproval({
    address: team.value.expenseAccountEip712Address as Address,
    args: [signatureHash],
    abi: expenseAccountABI,
    functionName: 'deactivateApproval'
  })
}

//activate approval
const {
  writeContract: executeActivateApproval,
  isPending: isLoadingActivateApproval,
  error: errorActivateApproval,
  data: activateHash
} = useWriteContract()

watch(errorActivateApproval, (newVal) => {
  if (newVal) {
    log.error(parseError(newVal))
    addErrorToast('Failed to activate approval')
  }
})

const { isLoading: isConfirmingActivate, isSuccess: isConfirmedActivate } =
  useWaitForTransactionReceipt({
    hash: activateHash
  })
watch(isConfirmingActivate, async (isConfirming, wasConfirming) => {
  if (!isConfirming && wasConfirming && isConfirmedActivate.value) {
    addSuccessToast('Activate Successful')
    await initializeBalances()
  }
})

const activateApproval = async (signature: `0x{string}`, index: number) => {
  deactivateIndex.value = index
  const signatureHash = keccak256(signature)

  executeActivateApproval({
    address: team.value.expenseAccountEip712Address as Address,
    args: [signatureHash],
    abi: expenseAccountABI,
    functionName: 'activateApproval'
  })
}

// useFetch instance for fetching expence account data
const {
  error: fetchExpenseAccountDataError,
  // isFetching: isFetchingExpenseAccountData,
  execute: fetchExpenseAccountData,
  data: _expenseAccountData
} = useCustomFetch(`teams/${String(team.value.id)}/expense-data`, {
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
} = useCustomFetch(`teams/${String(team.value.id)}/expense-data`, {
  immediate: false
})
  .get()
  .json<ManyExpenseResponse[]>()

watch(fetchManyExpenseAccountDataError, (newVal) => {
  if (newVal) {
    addErrorToast('Error fetching many expense account data')
    log.error(parseError(newVal))
  }
})

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

const { execute: executeAddExpenseData } = useCustomFetch(`teams/${team.value.id}/expense-data`, {
  immediate: false
})
  .post(expenseAccountData)
  .json()

watch(searchUserResponse, () => {
  if (searchUserResponse.value?.ok && users.value?.users) {
    foundUsers.value = users.value.users
  }
})

//#region helper functions
const init = async () => {
  await getExpenseAccountOwner()
  await fetchExpenseAccountData()
  await fetchManyExpenseAccountData()
  await initializeBalances()
  // await fetchExpenseAccountData()
  await getAmountWithdrawnBalance()
  await fetchUsdcBalance()
}

const getExpenseAccountOwner = async () => {
  if (team.value.expenseAccountEip712Address) await executeExpenseAccountGetOwner()
}

const getAmountWithdrawnBalance = async () => {
  if (team.value.expenseAccountEip712Address) {
    if (!_expenseAccountData?.value?.data) return
    signatureHash.value = keccak256(_expenseAccountData.value.signature)
    await executeGetAmountWithdrawn()
  }
}

const transferFromExpenseAccount = async (to: string, amount: string) => {
  if (team.value.expenseAccountEip712Address && _expenseAccountData.value.data) {
    const budgetLimit: BudgetLimit = JSON.parse(_expenseAccountData.value.data)

    executeExpenseAccountTransfer({
      address: team.value.expenseAccountEip712Address as Address,
      args: [
        to,
        parseEther(amount),
        {
          ...budgetLimit,
          budgetData: budgetLimit.budgetData.map((item) => ({
            ...item,
            value: item.budgetType === 0 ? item.value : parseEther(`${item.value}`)
          }))
        },
        _expenseAccountData.value.signature
      ],
      abi: expenseAccountABI,
      functionName: 'transfer'
    })
  }
}

const { signTypedData, data: signature, error: signTypedDataError } = useSignTypedData()

watch(signature, async (newVal) => {
  if (newVal && expenseAccountData.value) {
    expenseAccountData.value = {
      expenseAccountData: expenseAccountData.value,
      signature
    }
    await executeAddExpenseData()
    emits('getTeam')
    loadingApprove.value = false
  }
})

watch(signTypedDataError, async (newVal) => {
  if (newVal) {
    addErrorToast('Error signing expense data')
    log.error('signTypedDataError.value', parseError(newVal))
    loadingApprove.value = false
  }
})

const approveUser = async (data: BudgetLimit) => {
  loadingApprove.value = true
  expenseAccountData.value = data
  const verifyingContract = team.value.expenseAccountEip712Address

  const domain = {
    name: 'CNCExpenseAccount',
    version: '1',
    chainId: chainId.value,
    verifyingContract: verifyingContract as Address
  }
  const types = {
    BudgetData: [
      { name: 'budgetType', type: 'uint8' },
      { name: 'value', type: 'uint256' }
    ],
    BudgetLimit: [
      { name: 'approvedAddress', type: 'address' },
      { name: 'budgetData', type: 'BudgetData[]' },
      { name: 'expiry', type: 'uint256' }
    ]
  }

  const message = {
    ...data,
    budgetData: data.budgetData?.map((item) => ({
      ...item,
      value: item.budgetType === 0 ? item.value : parseEther(`${item.value}`)
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
//#endregion helper functions

//#region watch error
watch(errorGetOwner, (newVal) => {
  if (newVal) addErrorToast(errorMessage(newVal, 'Error Getting Contract Owner'))
})

watch(
  () => team.value.expenseAccountAddress,
  async (newVal) => {
    if (newVal) await init()
  }
)

watch(fetchExpenseAccountDataError, (newVal) => {
  if (newVal) addErrorToast('Error fetching expense account data')
})
//#endregion watch success

const chainId = useChainId()
const {
  data: expenseAccountBalance,
  isLoading: isLoadingExpenseAccountBalance,
  error: isErrorExpenseAccountBalance,
  refetch: executeGetExpenseAccountBalance
} = useBalance({
  address: team.value.expenseAccountEip712Address as Address,
  chainId
})
watch(isErrorExpenseAccountBalance, (newVal) => {
  if (newVal) {
    log.error(parseError(newVal))
    addErrorToast('Error fetching expense account data')
  }
})

// Token related refs
const tokenTransferModal = ref(false)
const tokenAmount = ref('')
const tokenRecipient = ref('')
const selectedToken = ref('USDC')

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
  args: [team.value.expenseAccountEip712Address as Address]
})

const isLoadingTokenBalances = computed(() => isLoadingUsdcBalance.value)

// Token transfer
const {
  writeContract: writeTokenTransfer,
  isPending: isLoadingTokenTransfer,
  data: tokenTransferHash,
  error: tokenTransferError
} = useWriteContract()

const { isLoading: isConfirmingTokenTransfer } = useWaitForTransactionReceipt({
  hash: tokenTransferHash
})

// Token approval
const {
  writeContract: approve,
  error: approveError,
  data: approveHash,
  isPending: isPendingApprove
} = useWriteContract()

const { isLoading: isConfirmingApprove } = useWaitForTransactionReceipt({
  hash: approveHash
})

// Token transfer function
const transferToken = async () => {
  if (
    !team.value.expenseAccountEip712Address ||
    !tokenAmount.value ||
    !tokenRecipient.value ||
    !_expenseAccountData.value?.data
  )
    return

  const tokenAddress = USDC_ADDRESS
  const amount = BigInt(Number(tokenAmount.value) * 1e6)
  const budgetLimit: BudgetLimit = JSON.parse(_expenseAccountData.value.data)

  try {
    const allowance = await readContract(config, {
      address: tokenAddress as Address,
      abi: ERC20ABI,
      functionName: 'allowance',
      args: [currentUserAddress as Address, team.value.expenseAccountEip712Address as Address]
    })

    const currentAllowance = allowance ? allowance.toString() : 0n
    if (Number(currentAllowance) < Number(amount)) {
      approve({
        address: tokenAddress as Address,
        abi: ERC20ABI,
        functionName: 'approve',
        args: [team.value.expenseAccountEip712Address as Address, amount]
      })
    } else {
      writeTokenTransfer({
        address: team.value.expenseAccountEip712Address as Address,
        abi: expenseAccountABI,
        functionName: 'transferToken',
        args: [
          tokenRecipient.value as Address,
          tokenAddress as Address,
          amount,
          {
            ...budgetLimit,
            budgetData: budgetLimit.budgetData.map((item) => ({
              ...item,
              value: item.budgetType === 0 ? item.value : parseEther(`${item.value}`)
            }))
          },
          _expenseAccountData.value.signature
        ]
      })
    }
  } catch (error) {
    log.error(parseError(error))
    addErrorToast('Failed to transfer token')
  }
}

// Watch for token transfer events
watch(isConfirmingTokenTransfer, (newIsConfirming, oldIsConfirming) => {
  if (!newIsConfirming && oldIsConfirming) {
    addSuccessToast('Token transferred successfully')
    fetchUsdcBalance()
    tokenTransferModal.value = false
    tokenAmount.value = ''
    tokenRecipient.value = ''
  }
})

watch(tokenTransferError, () => {
  if (tokenTransferError.value) {
    log.error(parseError(tokenTransferError.value))
    addErrorToast('Failed to transfer token')
  }
})

watch(approveError, () => {
  if (approveError.value) {
    log.error(parseError(approveError.value))
    addErrorToast('Failed to approve token spending')
  }
})

watch(isConfirmingApprove, (newIsConfirming, oldIsConfirming) => {
  if (!newIsConfirming && oldIsConfirming) {
    addSuccessToast('Approval granted successfully')
    transferToken()
  }
})

watch([usdcBalanceError], ([newUsdcError]) => {
  if (newUsdcError) {
    log.error(parseError(newUsdcError))
    addErrorToast('Failed to fetch USDC balance')
  }
})

onMounted(async () => {
  await init()
})
</script>
