<template>
  <CardComponent title="Approved Addresses" data-test="claims-table">
    <template #card-action>
      <ButtonUI
        variant="success"
        :disabled="!(userDataStore.address === contractOwnerAddress || isBodAction())"
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
</template>
<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import ButtonUI from '@/components/ButtonUI.vue'
import ModalComponent from '@/components/ModalComponent.vue'
import CardComponent from '@/components/CardComponent.vue'
import ExpenseAccountTable from '@/components/sections/ExpenseAccountView/ExpenseAccountTable.vue'
import ApproveUsersForm from '@/components/forms/ApproveUsersEIP712Form.vue'
import { useUserDataStore, useTeamStore, useToastStore } from '@/stores'
import { useCustomFetch } from '@/composables/useCustomFetch'
import { useRoute } from 'vue-router'
import { useReadContract, useChainId, useSignTypedData } from '@wagmi/vue'
import { parseEther, zeroAddress, type Address } from 'viem'
import expenseAccountABI from '@/artifacts/abi/expense-account-eip712.json'
import type { Team, User, BudgetLimit } from '@/types'
import { parseError } from '@/utils'

const approveUsersModal = ref(false)
const reload = ref(false)
const foundUsers = ref<User[]>([])
const searchUserName = ref('')
const searchUserAddress = ref('')
const teamMembers = ref([{ name: '', address: '', isValid: false }])
const loadingApprove = ref(false)
const expenseAccountData = ref<{}>()

const userDataStore = useUserDataStore()
const { addErrorToast } = useToastStore()
const route = useRoute()
const chainId = useChainId()
const { signTypedDataAsync, data: signature } = useSignTypedData()
const _team = useTeamStore()

//#region useCustomfetch
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
//#region

const {
  data: contractOwnerAddress,
  refetch: refetchExpenseAccountGetOwner,
  error: errorGetOwner
} = useReadContract({
  functionName: 'owner',
  address: _team.currentTeam?.expenseAccountEip712Address as unknown as Address,
  abi: expenseAccountABI
})

//#region Funtions
const init = async () => {
  await refetchExpenseAccountGetOwner()
  await executeFetchTeam()
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

  await signTypedDataAsync({
    types,
    primaryType: 'BudgetLimit',
    message,
    domain
  })

  expenseAccountData.value = {
    expenseAccountData: expenseAccountData.value,
    signature: signature.value
  }
  await executeAddExpenseData()
  reload.value = true
  await init()
  loadingApprove.value = false
  approveUsersModal.value = false
  reload.value = false
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

const isBodAction = () => false
//#region

//#region Watch
watch(
  () => team.value?.expenseAccountAddress,
  async (newVal) => {
    if (newVal) await init()
  }
)
watch(searchUserResponse, () => {
  if (searchUserResponse.value?.ok && users.value?.users) {
    foundUsers.value = users.value.users
  }
})
watch(errorGetOwner, (newVal) => {
  if (newVal) addErrorToast(errorMessage(newVal, 'Error Getting Contract Owner'))
})
//#endregion

onMounted(async () => {
  await init()
})
</script>
