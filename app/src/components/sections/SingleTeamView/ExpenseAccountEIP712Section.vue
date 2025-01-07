<template>
  <div class="flex flex-col gap-y-4">
    <div
      v-if="team.expenseAccountEip712Address"
      class="stats bg-green-100 flex text-primary-content border-outline p-5 overflow-visible"
    >
      <!-- Expense A/c Info Section -->
      <section class="stat flex flex-col justify-start">
        <div
          class="flex flex-col sm:flex-row justify-between items-start sm:items-start gap-4 mb-10"
        >
          <div>
            <span>Expense Account Balance</span>
            <div class="font-extrabold text-4xl" data-test="expense-account-balance">
              <span class="inline-block min-w-16 h-10">
                <span
                  class="loading loading-spinner loading-lg"
                  v-if="isLoadingExpenseAccountBalance"
                ></span>
                <span v-else>{{ expenseBalanceFormatted }} </span>
              </span>
              <span class="text-xs">{{ ' ' + NETWORK.currencySymbol }}</span>
            </div>
            <span class="text-xs sm:text-sm">≈ $ 1.28</span>
          </div>
          <div class="flex flex-wrap gap-2 sm:gap-4" data-test="expense-account-address">
            <span class="text-sm">Expense Account Address </span>
            <AddressToolTip :address="team.expenseAccountEip712Address ?? ''" class="text-xs" />
          </div>
        </div>

        <!-- New Header -->
        <div>
          <div class="overflow-x-auto" data-test="approval-table">
            <table class="table">
              <!-- head -->
              <thead class="text-sm font-bold">
                <tr>
                  <th>Expiry Date</th>
                  <th>Max Amount Per Tx</th>
                  <th>Total Transactions</th>
                  <th>Total Transfers</th>
                  <th>Action</th>
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
                      :disabled="!_expenseAccountData?.data"
                      v-if="true"
                      @click="transferModal = true"
                      data-test="transfer-button"
                    >
                      Transfer
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

    <!--<div
      v-if="manyExpenseAccountData"
      class="stats bg-green-100 flex flex-col justify-start text-primary-content border-outline p-5 overflow-visible"
    >
      <div class="flex flex-row justify-between mb-5">
        <span class="text-2xl font-bold">Approved Addresses</span>
        <ButtonUI
          variant="secondary"
          :disabled="!(currentUserAddress === contractOwnerAddress || isBodAction())"
          @click="approveUsersModal = true"
          data-test="approve-users-button"
        >
          Approve User
        </ButtonUI>
      </div>
      <div class="overflow-x-auto" data-test="approvals-list-table">
        <table class="table">
          -- head -->
          <!--<thead class="text-sm font-bold">
            <tr>
              <th>User</th>
              <th>Expiry Date</th>
              <th>Max Amount Per Tx</th>
              <th>Total Transactions</th>
              <th>Total Transfers</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(data, index) in manyExpenseAccountData" :key="index">
              <td class="flex flex-row justify-start gap-4">
                <div role="button" class="relative group">
                  <div class="relative rounded-full overflow-hidden w-11 h-11 ring-2 ring-white/50">
                    <img
                      alt="User Avatar"
                      :src="
                        data.avatarUrl ||
                        'https://img.daisyui.com/images/stock/photo-1534528741775-53994a69daeb.webp'
                      "
                      class="w-full h-full object-cover"
                    />
                  </div>
                </div>
                <div class="flex flex-col text-gray-600">
                  <p class="font-bold text-sm line-clamp-1" data-test="user-name">
                    {{ data.name || 'User' }}
                  </p>
                  <p class="text-sm">
                    {{
                      `${(data.approvedAddress as string).slice(0, 6)}...${(data.approvedAddress as string).slice(37)}`
                    }}
                  </p>
                </div>
              </td>
              <td>{{ new Date(data.expiry * 1000).toLocaleString('en-US') }}</td>
              <td>{{ data.budgetData[2].value }}</td>
              <td>{{ `${getLimitBalance(data.signature, 0)}/${data.budgetData[0].value}` }}</td>
              <td>{{ `${getLimitBalance(data.signature, 1)}/${data.budgetData[1].value}` }}</td>
              <td class="flex justify-end" data-test="action-td">
                <ButtonUI
                  :disabled="contractOwnerAddress !== currentUserAddress"
                  class="btn btn-success"
                  :loading="isLoadingDeactivateApproval && deactivateIndex === index"
                  @click="deactivateApproval(data.signature, index)"
                >
                  Deactivate
                </ButtonUI>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>-->

    <!-- Activated List -->    
    <div
      v-if="manyExpenseAccountDataActive.length > 0 || manyExpenseAccountData"
      class="stats bg-green-100 flex flex-col justify-start text-primary-content border-outline p-5 overflow-visible"
    >
      <div class="flex flex-row justify-between mb-5">
        <span class="text-2xl font-bold">Approved Addresses</span>
        <ButtonUI
          variant="secondary"
          :disabled="!(currentUserAddress === contractOwnerAddress || isBodAction())"
          @click="approveUsersModal = true"
          data-test="approve-users-button"
        >
          Approve User
        </ButtonUI>
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
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(data, index) in manyExpenseAccountDataActive" :key="index">
              <td class="flex flex-row justify-start gap-4">
                <div role="button" class="relative group">
                  <div class="relative rounded-full overflow-hidden w-11 h-11 ring-2 ring-white/50">
                    <img
                      alt="User Avatar"
                      :src="
                        data.avatarUrl ||
                        'https://img.daisyui.com/images/stock/photo-1534528741775-53994a69daeb.webp'
                      "
                      class="w-full h-full object-cover"
                    />
                  </div>
                </div>
                <div class="flex flex-col text-gray-600">
                  <p class="font-bold text-sm line-clamp-1" data-test="user-name">
                    {{ data.name || 'User' }}
                  </p>
                  <p class="text-sm">
                    {{
                      `${(data.approvedAddress as string).slice(0, 6)}...${(data.approvedAddress as string).slice(37)}`
                    }}
                  </p>
                </div>
              </td>
              <td>{{ new Date(data.expiry * 1000).toLocaleString('en-US') }}</td>
              <td>{{ data.budgetData[2].value }}</td>
              <td>{{ `${data.balances['0']}/${data.budgetData[0].value}` }}</td>
              <td>{{ `${data.balances['1']}/${data.budgetData[1].value}` }}</td>
              <td class="flex justify-end" data-test="action-td">
                <ButtonUI
                  :disabled="contractOwnerAddress !== currentUserAddress"
                  class="btn btn-success"
                  :loading="isLoadingDeactivateApproval && deactivateIndex === index"
                  @click="deactivateApproval(data.signature, index)"
                >
                  Deactivate
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
      class="stats bg-green-100 flex flex-col justify-start text-primary-content border-outline p-5 overflow-visible"
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
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(data, index) in manyExpenseAccountDataInactive" :key="index">
              <td class="flex flex-row justify-start gap-4">
                <div role="button" class="relative group">
                  <div class="relative rounded-full overflow-hidden w-11 h-11 ring-2 ring-white/50">
                    <img
                      alt="User Avatar"
                      :src="
                        data.avatarUrl ||
                        'https://img.daisyui.com/images/stock/photo-1534528741775-53994a69daeb.webp'
                      "
                      class="w-full h-full object-cover"
                    />
                  </div>
                </div>
                <div class="flex flex-col text-gray-600">
                  <p class="font-bold text-sm line-clamp-1" data-test="user-name">
                    {{ data.name || 'User' }}
                  </p>
                  <p class="text-sm">
                    {{
                      `${(data.approvedAddress as string).slice(0, 6)}...${(data.approvedAddress as string).slice(37)}`
                    }}
                  </p>
                </div>
              </td>
              <td>{{ new Date(data.expiry * 1000).toLocaleString('en-US') }}</td>
              <td>{{ data.budgetData[2].value }}</td>
              <td>{{ `${data.balances['0']}/${data.budgetData[0].value}` }}</td>
              <td>{{ `${data.balances['1']}/${data.budgetData[1].value}` }}</td>
              <td class="flex justify-end" data-test="action-td">
                <ButtonUI
                  :disabled="contractOwnerAddress !== currentUserAddress"
                  class="btn btn-success"
                  :loading="isLoadingDeactivateApproval && deactivateIndex === index"
                  @click="deactivateApproval(data.signature, index)"
                >
                  Activate
                </ButtonUI>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
  <!-- Expense Account Not Yet Created -->
</template>

<script setup lang="ts">
//#region imports
import { computed, onMounted, reactive, ref, watch } from 'vue'
import type { Team, User, BudgetLimit, BudgetData, ManyExpenseResponse, ManyExpenseWithBalances } from '@/types'
import { NETWORK } from '@/constant'
import TransferFromBankForm from '@/components/forms/TransferFromBankForm.vue'
import ModalComponent from '@/components/ModalComponent.vue'
import ApproveUsersForm from './forms/ApproveUsersEIP712Form.vue'
import AddressToolTip from '@/components/AddressToolTip.vue'
import { useUserDataStore, useToastStore } from '@/stores'
import { useCustomFetch } from '@/composables/useCustomFetch'
import { parseError, log } from '@/utils'
import { EthersJsAdapter } from '@/adapters/web3LibraryAdapter'
import {
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  useBalance,
  useChainId
} from '@wagmi/vue'
import expenseAccountABI from '@/artifacts/abi/expense-account-eip712.json'
import { type Address, formatEther, parseEther, keccak256 } from 'viem'
import ButtonUI from '@/components/ButtonUI.vue'
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
          //@ts-ignore
          value: Number(amountWithdrawn.value[0])
        }
      } else {
        return {
          ...data,
          //@ts-ignore
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
const web3Library = new EthersJsAdapter()
// const expenseBalanceFormated = ref<string | number>(`0`)
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

watch(amountWithdrawn, async (newVal) => {
  // if (newVal) await initializeBalances()
})

// const manyExpenseDataWithBalances = computed(() => manyExpenseAccountData.value?.map(item => {
//   signatureHash.value = keccak256(item.signature)

//   await executeGetAmountWithdrawn()

//   if (Array.isArray(amountWithdrawn.value)) {
//     return {
//       ...item,
//       balances: {
//         0: amountWithdrawn.value[0],
//         1: formatEther(amountWithdrawn.value[1]),
//         2: amountWithdrawn.value[2] === 2? 
//           false:
//           true
//     }}
//   } else {
//     return {
//       ...item,
//       balances: {
//         0: '--',
//         1: '--',
//         2: false
//     }}
//   }
// }))

// Reactive storage for balances
const balances = reactive<Record<string, { [key: number]: string | boolean }>>({})

const manyExpenseAccountDataActive = reactive<ManyExpenseWithBalances[]>([])
const manyExpenseAccountDataInactive = reactive<ManyExpenseWithBalances[]>([])

// Async initialization function
const initializeBalances = async () => {
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
        balances[signatureHash.value] = {
          0: `${amountWithdrawn.value[0]}`,
          1: formatEther(amountWithdrawn.value[1]),
          2: amountWithdrawn.value[2] === 2? 
            false:
            true
        }
      } else {
        manyExpenseAccountDataInactive.push({
          ...data,
          balances: {
            0: '--',
            1: '--',
            2: false
          }  
        })
        balances[signatureHash.value] = {
          0: '--',
          1: '--',
          2: false
        }
      }
    }
}

// Computed property for getting balances
const getLimitBalance = computed(() => {
  return (signature: `0x{string}`, index: number): string | boolean => {
    const signatureHash = keccak256(signature)
    return balances[signatureHash] ? `${balances[signatureHash][`${index}`]}` : 'xx'
  }
})

watch(errorGetAmountWithdrawn, (newVal) => {
  if (newVal) {
    log.error(parseError(newVal))
    addErrorToast('Failed to fetch amount withdrawn')
  }
})

// watch(signatureHash, async (newVal) => {
//   if (newVal) {
//     await executeGetAmountWithdrawn()
//   }
// })

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

// watch(balances, (newVal) => {
//   if (newVal)
//   console.log(`balances: `, balances)
// })

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
    // await getExpenseAccountBalance()
    // await getAmountWithdrawnBalance()
    // transferModal.value = false
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

const approveUser = async (data: BudgetLimit) => {
  loadingApprove.value = true
  const provider = await web3Library.getProvider()
  const signer = await web3Library.getSigner()
  const chainId = (await provider.getNetwork()).chainId
  const verifyingContract = team.value.expenseAccountEip712Address

  const domain = {
    name: 'CNCExpenseAccount',
    version: '1',
    chainId,
    verifyingContract
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

  try {
    const signature = await signer.signTypedData(domain, types, {
      ...data,
      budgetData: data.budgetData.map((item) => ({
        ...item,
        value: item.budgetType === 0 ? item.value : parseEther(`${item.value}`)
      }))
    })

    expenseAccountData.value = {
      expenseAccountData: data,
      signature
    }
    await executeAddExpenseData()
    emits('getTeam')
  } catch (err) {
    log.error(parseError(err))
    addErrorToast(parseError(err))
  } finally {
    loadingApprove.value = false
  }
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

onMounted(async () => {
  await init()
  console.log(`manyExpenseAccountDataActive `, JSON.stringify(manyExpenseAccountDataActive))
})
</script>
