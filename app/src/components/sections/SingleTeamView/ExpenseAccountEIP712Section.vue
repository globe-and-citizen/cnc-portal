<template>
  <div class="flex flex-col gap-y-4">
    <div
      v-if="team.expenseAccountEip712Address"
      class="stats bg-green-100 flex text-primary-content border-outline justify-center items-center p-5 overflow-visible"
    >
      <!-- Expense A/c Info Section -->
      <section class="stat flex flex-col justify-center items-center">
        <div class="stat-title text-center">Expense Account Address</div>

        <span class="flex gap-2 items-center">
          <ToolTip
            data-test="expense-account-address-tooltip"
            content="Click to see address in block explorer"
          >
            <span
              class="badge badge-sm cursor-pointer"
              data-test="expense-account-address"
              @click="openExplorer(team.expenseAccountEip712Address)"
              :class="`${team.ownerAddress == currentUserAddress ? 'badge-primary' : 'badge-secondary'}`"
              >{{ team.expenseAccountEip712Address }}</span
            >
          </ToolTip>
          <ToolTip
            data-test="copy-address-tooltip"
            :content="copied ? 'Copied!' : 'Click to copy address'"
          >
            <ClipboardDocumentListIcon
              v-if="isSupported && !copied"
              class="size-5 cursor-pointer"
              @click="copy(team.expenseAccountEip712Address)"
            />
            <ClipboardDocumentCheckIcon v-if="copied" class="size-5" />
          </ToolTip>
        </span>

        <div class="flex items-center pt-3 mt-10" style="border-width: 0">
          <div>
            <div class="stat-title pr-3">Balance</div>
            <div
              v-if="isLoadingGetExpenseBalance"
              class="stat-value mt-1 border-r border-gray-400 pr-3"
            >
              <span class="loading loading-dots loading-xs" data-test="balance-loading"> </span>
            </div>
            <div
              v-else
              class="stat-value text-3xl mt-2 border-r border-gray-400 pr-3"
              data-test="contract-balance"
            >
              {{ expenseBalanceFormated }} <span class="text-xs">{{ NETWORK.currencySymbol }}</span>
            </div>
          </div>

          <div class="pl-3">
            <div class="stat-title pr-3">Max Limit</div>
            <div
              v-if="isFetchingExpenseAccountData"
              class="stat-value mt-1 border-r border-gray-400 pr-3"
            >
              <span class="loading loading-dots loading-xs" data-test="max-loading"> </span>
            </div>
            <div
              v-else
              class="stat-value text-3xl mt-2 border-r border-gray-400 pr-3"
              data-test="max-limit"
            >
              {{ maxLimit }} <span class="text-xs">{{ dynamicDisplayData?.symbol }}</span>
            </div>
          </div>

          <div class="pl-3">
            <div class="stat-title pr-3">{{ dynamicDisplayData?.heading }}</div>
            <div v-if="false" class="stat-value mt-1 pr-3">
              <span class="loading loading-dots loading-xs" data-test="limit-loading"> </span>
            </div>
            <div v-else class="stat-value text-3xl mt-2 pr-3" data-test="limit-balance">
              {{ dynamicDisplayData?.value }}
              <span class="text-xs">{{ dynamicDisplayData?.symbol }}</span>
            </div>
          </div>
        </div>

        <div class="stat-title text-center mt-10">
          Approval Expiry:
          <span data-test="approval-expiry" class="font-bold text-black">{{ expiry }}</span>
        </div>

        <div class="stat-actions flex justify-center gap-2 items-center mt-8">
          <button
            class="btn btn-secondary"
            :disabled="!_expenseAccountData?.data"
            v-if="true"
            @click="transferModal = true"
            data-test="transfer-button"
          >
            Transfer
          </button>
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
      </section>

      <!-- Approve User Form -->
      <section
        v-if="contractOwnerAddress === currentUserAddress || isBodAction()"
        class="stat flex flex-col justify-center items-center"
      >
        <div class="w-3/4">
          <ApproveUsersForm
            :form-data="teamMembers"
            :users="foundUsers"
            :loading-approve="loadingApprove"
            :is-bod-action="isBodAction()"
            @approve-user="approveUser"
            @close-modal="approveUsersModal = false"
            @search-users="(input) => searchUsers(input)"
          />
        </div>
      </section>
    </div>
  </div>
  <!-- Expense Account Not Yet Created -->
</template>

<script setup lang="ts">
//#region imports
import { computed, onMounted, ref, watch } from 'vue'
import type { Team, User, BudgetLimit } from '@/types'
import { NETWORK } from '@/constant'
import TransferFromBankForm from '@/components/forms/TransferFromBankForm.vue'
import ModalComponent from '@/components/ModalComponent.vue'
import ApproveUsersForm from './forms/ApproveUsersEIP712Form.vue'
import { useClipboard } from '@vueuse/core'
import ToolTip from '@/components/ToolTip.vue'
import { ClipboardDocumentListIcon, ClipboardDocumentCheckIcon } from '@heroicons/vue/24/outline'
import { useUserDataStore, useToastStore } from '@/stores'
import { useCustomFetch } from '@/composables/useCustomFetch'
import { parseError, log } from '@/utils'
import { EthersJsAdapter } from '@/adapters/web3LibraryAdapter'
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from '@wagmi/vue'
import expenseAccountABI from '@/artifacts/abi/expense-account-eip712.json'
import { type Address, formatEther, parseEther, parseSignature, hashTypedData } from 'viem'

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
const maxLimit = computed(() =>
  _expenseAccountData.value?.data ? JSON.parse(_expenseAccountData.value.data).value : '0.0'
)
const expiry = computed(() => {
  if (_expenseAccountData.value?.data) {
    const unixEpoch = JSON.parse(_expenseAccountData.value.data).expiry
    const date = new Date(Number(unixEpoch) * 1000)
    return date.toLocaleString('en-US')
  } else {
    return '--/--/--, --:--:--'
  }
})
const dynamicDisplayData = computed(() => {
  if (_expenseAccountData.value?.data && amountWithdrawn.value) {
    const budgetType = JSON.parse(_expenseAccountData.value.data).budgetType
    if (budgetType === 0) {
      return {
        //@ts-ignore
        value: Number(amountWithdrawn.value[0]),
        heading: 'Total Transactions',
        symbol: 'TXs'
      }
    } else {
      return {
        //@ts-ignore
        value: formatEther(amountWithdrawn.value[1]),
        heading: 'Total Withdrawn',
        symbol: NETWORK.currencySymbol
      }
    }
  } else {
    return { value: `0.0`, heading: 'Total Withdrawn', symbol: NETWORK.currencySymbol }
  }
})
// const limitBalanceHeading = computed(() => {
//   if ()
// })
const { addErrorToast, addSuccessToast } = useToastStore()
const { copy, copied, isSupported } = useClipboard()
const web3Library = new EthersJsAdapter()
const expenseBalanceFormated = ref<string | number>(`0`)
const digest = ref<string | null>(null)
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
  data: expenseBalance,
  refetch: executeGetExpenseBalance,
  //error: errorGetExpenseBalance,
  isLoading: isLoadingGetExpenseBalance
} = useReadContract({
  functionName: 'getBalance',
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
  args: [digest]
})

watch(errorGetAmountWithdrawn, (newVal) => {
  if (newVal) {
    log.error(parseError(newVal))
    addErrorToast('Failed to fetch amount withdrawn')
  }
})

watch(digest, async (newVal) => {
  if (newVal) {
    await executeGetAmountWithdrawn()
    console.log(`amountWithdrawn`, amountWithdrawn)
  }
})

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
    await getExpenseAccountBalance()
    await getAmountWithdrawnBalance()
    transferModal.value = false
  }
})

// useFetch instance for deleting member
const {
  error: fetchExpenseAccountDataError,
  isFetching: isFetchingExpenseAccountData,
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
const getDigest = async () => {
  const domain = await getDomain()
  const types = await getTypes()
  if (!_expenseAccountData?.value?.data) return
  let message = JSON.parse(_expenseAccountData.value.data)
  if (typeof message.value === 'string') message.value = Number(parseEther(message.value))
  const _digest = hashTypedData({
    domain: { ...domain, chainId: Number(domain.chainId) },
    types,
    primaryType: 'BudgetLimit',
    message
  })

  digest.value = _digest
}
const init = async () => {
  await fetchExpenseAccountData()
  await getExpenseAccountOwner()
  await getExpenseAccountBalance()
  await getAmountWithdrawnBalance()
}

const getExpenseAccountOwner = async () => {
  if (team.value.expenseAccountEip712Address) await executeExpenseAccountGetOwner()
}

const getExpenseAccountBalance = async () => {
  if (team.value.expenseAccountEip712Address) {
    await executeGetExpenseBalance()
    expenseBalanceFormated.value = formatEther(expenseBalance.value as bigint)
  }
}

const getAmountWithdrawnBalance = async () => {
  if (team.value.expenseAccountEip712Address) {
    await getDigest()
    await executeGetAmountWithdrawn()
  }
}

const transferFromExpenseAccount = async (to: string, amount: string) => {
  if (team.value.expenseAccountEip712Address && _expenseAccountData.value.data) {
    const budgetLimit: BudgetLimit = JSON.parse(_expenseAccountData.value.data)
    //const { v, r, s } = parseSignature(_expenseAccountData.value.signature)

    //if (typeof budgetLimit.value === 'string') budgetLimit.value = parseEther(budgetLimit.value)

    executeExpenseAccountTransfer({
      address: team.value.expenseAccountEip712Address as Address,
      args: [
        to, 
        parseEther(amount), {
        ...budgetLimit,
        budgetData: budgetLimit.budgetData.map(item => ({
          ...item,
          value: item.budgetType === 0?
            item.value:
            parseEther(`${item.value}`)
        }))},
        _expenseAccountData.value.signature],
      abi: expenseAccountABI,
      functionName: 'transfer'
    })
  }
}

const getDomain = async () => {
  const provider = await web3Library.getProvider()
  const chainId = (await provider.getNetwork()).chainId
  const verifyingContract = team.value.expenseAccountEip712Address as Address

  return {
    name: 'CNCExpenseAccount',
    version: '1',
    chainId, //: 31337n,
    verifyingContract //: '0x6DcBc91229d812910b54dF91b5c2b592572CD6B0'
  }
}

const getTypes = async () => {
  return {
    BudgetLimit: [
      { name: 'approvedAddress', type: 'address' },
      { name: 'budgetType', type: 'uint8' },
      { name: 'value', type: 'uint256' },
      { name: 'expiry', type: 'uint256' }
    ]
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
    chainId, //: 31337n,
    verifyingContract //: '0x6DcBc91229d812910b54dF91b5c2b592572CD6B0'
  }

  // const types = {
  //   BudgetLimit: [
  //     { name: 'approvedAddress', type: 'address' },
  //     { name: 'budgetType', type: 'uint8' },
  //     { name: 'value', type: 'uint256' },
  //     { name: 'expiry', type: 'uint256' }
  //   ]
  // }

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
    const signature = await signer.signTypedData(
      domain, 
      types, {
        ...data,
        budgetData: data.budgetData.map(item => ({
          ...item,
          value: item.budgetType === 0?
            item.value:
            parseEther(`${item.value}`)
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

const openExplorer = (address: string) => {
  window.open(`${NETWORK.blockExplorerUrl}/address/${address}`, '_blank')
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

onMounted(async () => {
  await init()
  // console.log(`expense account data`, _expenseAccountData.value)
})
</script>
