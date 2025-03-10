<template>
  <div class="flex flex-col gap-y-4">
    <!-- TODO move it to the top of the page when cash remuneration will have his own page -->
    <!-- Cash Remuneration stats: Only apear for owner -->
    <ExpenseStatsSection />

    <GenericTokenHoldingsSection
      v-if="team?.expenseAccountEip712Address"
      :address="team.expenseAccountEip712Address"
      class="mb-10"
    />

    <MyApprovedExpenseSection
      v-if="team"
      :team="team"
      :is-disapproved-address="isDisapprovedAddress"
      v-model="reload"
    />

    <CardComponent title="Approved Addresses" class="mb-8" data-test="claims-table">
      <template #card-action>
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
      </template>

      <ExpenseAccountTable v-if="team" :team="team" v-model="reload" />
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
    </CardComponent>

    <div data-test="claims-table">
      <TransactionHistorySection
        :currency-rates="{
          loading: false,
          error: null,
          getRate: () => 1
        }"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
//#region Imports
import { computed, onMounted, ref, watch } from 'vue'
import type { Team, User, BudgetLimit } from '@/types'
import { USDC_ADDRESS } from '@/constant'
import ExpenseStatsSection from '@/components/sections/ExpenseAccountView/ExpenseStatsSection.vue'
import ModalComponent from '@/components/ModalComponent.vue'
import ApproveUsersForm from '@/components/forms/ApproveUsersEIP712Form.vue'
import ExpenseAccountTable from '@/components/sections/ExpenseAccountView/ExpenseAccountTable.vue'
import TransactionHistorySection from '@/components/sections/ExpenseAccountView/TransactionHistorySection.vue'
import { useUserDataStore, useToastStore } from '@/stores'
import { useCustomFetch } from '@/composables/useCustomFetch'
import { parseError, log } from '@/utils'
import { useReadContract, useBalance, useChainId, useSignTypedData } from '@wagmi/vue'
import expenseAccountABI from '@/artifacts/abi/expense-account-eip712.json'
import { type Address, formatEther, parseEther, zeroAddress } from 'viem'
import ButtonUI from '@/components/ButtonUI.vue'
import ERC20ABI from '@/artifacts/abi/erc20.json'
import { useRoute } from 'vue-router'
import MyApprovedExpenseSection from '@/components/sections/ExpenseAccountView/MyApprovedExpenseSection.vue'
import { useExpenseAccountDataCollection } from '@/composables'
import GenericTokenHoldingsSection from '@/components/GenericTokenHoldingsSection.vue'
import CardComponent from '@/components/CardComponent.vue'

//#endregion

//#region Refs
const route = useRoute()
const approveUsersModal = ref(false)
const foundUsers = ref<User[]>([])
const searchUserName = ref('')
const searchUserAddress = ref('')
const teamMembers = ref([{ name: '', address: '', isValid: false }])
const loadingApprove = ref(false)
const reload = ref(false)
// Token related refs
const isLoadingTokenBalances = computed(() => isLoadingUsdcBalance.value)
const expenseAccountData = ref<{}>()
const expenseAccountEip712Address = computed(
  () => team.value?.expenseAccountEip712Address as Address
)

const expenseBalanceFormatted = computed(() => {
  if (typeof expenseAccountBalance.value?.value === 'bigint')
    return formatEther(expenseAccountBalance.value.value)
  else return '--'
})

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
const { addErrorToast } = useToastStore()
const { data: manyExpenseAccountDataAll, initializeBalances } = useExpenseAccountDataCollection()
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
//#endregion

//#region Functions
const init = async () => {
  await getExpenseAccountOwner()
  await executeFetchTeam()
  await executeGetExpenseAccountBalance()
  await fetchUsdcBalance()
  await initializeBalances()
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
watch(reload, async (newState) => {
  if (newState) {
    await init()
  }
})
watch(
  () => team.value?.expenseAccountAddress,
  async (newVal) => {
    if (newVal) await init()
  }
)
watch(signature, async (newVal) => {
  if (newVal && expenseAccountData.value) {
    expenseAccountData.value = {
      expenseAccountData: expenseAccountData.value,
      signature
    }
    await executeAddExpenseData()
    reload.value = true
    await init()
    loadingApprove.value = false
    approveUsersModal.value = false
    reload.value = false
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
watch(signTypedDataError, async (newVal) => {
  if (newVal) {
    addErrorToast('Error signing expense data')
    log.error('signTypedDataError.value', parseError(newVal))
    loadingApprove.value = false
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
