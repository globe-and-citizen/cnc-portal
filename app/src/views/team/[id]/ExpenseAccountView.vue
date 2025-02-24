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

    <MyApprovedExpenseSection
      v-if="team"
      :team="team"
      :is-disapproved-address="isDisapprovedAddress"
    />

    <div
      class="card shadow-xl bg-white p-5 overflow-x-auto flex flex-col gap-4"
      data-test="claims-table"
    >
      <div class="flex flex-row justify-between mb-5">
        <span class="text-2xl font-bold">Approved Addresses</span>
        <ButtonUI
          variant="success"
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
        :team="team"
        :approvals="manyExpenseAccountDataAll"
        :loading="isLoadingActivateApproval || isLoadingDeactivateApproval"
        :is-contract-owner="currentUserAddress === contractOwnerAddress"
        @disable-approval="(signature) => deactivateApproval(signature, 1)"
        @enable-approval="(signature) => activateApproval(signature, 1)"
      />
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
    </div>

    <div
      class="card shadow-xl bg-white p-5 overflow-x-auto flex flex-col gap-4"
      data-test="claims-table"
    >
      <ExpenseAccountTransferHistoryTable />
    </div>
  </div>
  <!-- Expense Account Not Yet Created -->
</template>

<script setup lang="ts">
//#region Imports
import { computed, onMounted, reactive, ref, watch } from 'vue'
import type { Team, User, BudgetLimit, ManyExpenseResponse, ManyExpenseWithBalances } from '@/types'
import { NETWORK, USDC_ADDRESS } from '@/constant'
import ModalComponent from '@/components/ModalComponent.vue'
import ApproveUsersForm from '@/components/forms/ApproveUsersEIP712Form.vue'
import AddressToolTip from '@/components/AddressToolTip.vue'
import ExpenseAccountTable from '@/components/sections/ExpenseAccountView/ExpenseAccountTable.vue'
import ExpenseAccountTransferHistoryTable from '@/components/sections/ExpenseAccountView/ExpenseAccountTransactionHistoryTable.vue'
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
import MyApprovedExpenseSection from '@/components/sections/ExpenseAccountView/MyApprovedExpenseSection.vue'
//#endregion

//#region Refs
const route = useRoute()
const approveUsersModal = ref(false)
const foundUsers = ref<User[]>([])
const searchUserName = ref('')
const searchUserAddress = ref('')
const teamMembers = ref([{ name: '', address: '', isValid: false }])
const loadingApprove = ref(false)
// Token related refs
const isLoadingTokenBalances = computed(() => isLoadingUsdcBalance.value)
const expenseAccountData = ref<{}>()
const deactivateIndex = ref<number | null>(null)
const expenseAccountEip712Address = computed(
  () => team.value?.expenseAccountEip712Address as Address
)

const expenseBalanceFormatted = computed(() => {
  if (typeof expenseAccountBalance.value?.value === 'bigint')
    return formatEther(expenseAccountBalance.value.value)
  else return '--'
})
const manyExpenseAccountDataAll = reactive<ManyExpenseWithBalances[]>([])

// Check if the current user is disapproved
const isDisapprovedAddress = computed(
  () =>
    manyExpenseAccountDataAll.findIndex(
      (item) =>
        item.approvedAddress === currentUserAddress &&
        (item.status === 'disabled' || item.status === 'expired')
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
  error: fetchManyExpenseAccountDataError,
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
  address: expenseAccountEip712Address as unknown as Address,
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
//#endregion

//#region Functions
// Async initialization function
const initializeBalances = async () => {
  manyExpenseAccountDataAll.length = 0
  if (Array.isArray(manyExpenseAccountData.value))
    for (const data of manyExpenseAccountData.value) {
      const amountWithdrawn = await readContract(config, {
        functionName: 'balances',
        address: expenseAccountEip712Address.value as unknown as Address,
        abi: expenseAccountABI,
        args: [keccak256(data.signature)]
      })

      const isExpired = data.expiry <= Math.floor(new Date().getTime() / 1000)

      // Populate the reactive balances object
      if (
        Array.isArray(amountWithdrawn) &&
        manyExpenseAccountDataAll.findIndex((item) => item.signature === data.signature) === -1
      ) {
        // New algo
        manyExpenseAccountDataAll.push({
          ...data,
          balances: {
            0: `${amountWithdrawn[0]}`,
            1:
              data.tokenAddress === zeroAddress
                ? formatEther(amountWithdrawn[1])
                : `${Number(amountWithdrawn[1]) / 1e6}`,
            2: amountWithdrawn[2] === true
          },
          status: isExpired ? 'expired' : amountWithdrawn[2] === 2 ? 'disabled' : 'enabled'
        })
      }
    }
}

const init = async () => {
  await getExpenseAccountOwner()
  await fetchManyExpenseAccountData()
  await executeFetchTeam()
  await executeGetExpenseAccountBalance()
  await fetchUsdcBalance()
  await initializeBalances()
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
      { name: 'value', type: 'uint256' }
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
