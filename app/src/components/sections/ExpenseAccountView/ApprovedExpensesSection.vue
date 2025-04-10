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

    <ExpenseAccountTable />

    <ModalComponent v-model="approveUsersModal">
      <ApproveUsersForm
        v-if="approveUsersModal"
        :form-data="teamMembers"
        :users="foundUsers"
        :loading-approve="loadingApprove"
        :is-bod-action="isBodAction()"
        @approve-user="approveUser"
        @close-modal="approveUsersModal = false"
      />
    </ModalComponent>
  </CardComponent>
</template>
<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import ButtonUI from '@/components/ButtonUI.vue'
import ModalComponent from '@/components/ModalComponent.vue'
import CardComponent from '@/components/CardComponent.vue'
import ExpenseAccountTable from '@/components/sections/ExpenseAccountView/ExpenseAccountTable.vue'
import ApproveUsersForm from '@/components/forms/ApproveUsersEIP712Form.vue'
import { useUserDataStore, useToastStore, useExpenseDataStore, useTeamStore } from '@/stores'
import { useCustomFetch } from '@/composables/useCustomFetch'
import { useRoute } from 'vue-router'
import { useReadContract, useChainId, useSignTypedData } from '@wagmi/vue'
import { parseEther, zeroAddress, type Address } from 'viem'
import expenseAccountABI from '@/artifacts/abi/expense-account-eip712.json'
import type { User, BudgetLimit } from '@/types'
import { log, parseError } from '@/utils'

const approveUsersModal = ref(false)
const foundUsers = ref<User[]>([])
const teamMembers = ref([{ name: '', address: '', isValid: false }])
const loadingApprove = ref(false)
const expenseAccountData = ref<{}>()

const teamStore = useTeamStore()
const userDataStore = useUserDataStore()
const expenseDataStore = useExpenseDataStore()
const { addErrorToast } = useToastStore()
const route = useRoute()
const chainId = useChainId()
const { signTypedDataAsync, data: signature, error: signTypedDataError } = useSignTypedData()

const expenseAccountEip712Address = computed(
  () =>
    teamStore.currentTeam?.teamContracts.find(
      (contract) => contract.type === 'ExpenseAccountEIP712'
    )?.address as Address
)

const { execute: executeAddExpenseData, error: errorAddExpenseData } = useCustomFetch(`expense`, {
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
  address: expenseAccountEip712Address,
  abi: expenseAccountABI
})

//#region Funtions
const approveUser = async (data: BudgetLimit) => {
  loadingApprove.value = true
  expenseAccountData.value = data
  const verifyingContract = expenseAccountEip712Address.value

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
    data,
    signature: signature.value,
    teamId: route.params.id
  }
  await executeAddExpenseData()
  await refetchExpenseAccountGetOwner()
  loadingApprove.value = false
  approveUsersModal.value = false
  await expenseDataStore.fetchAllExpenseData(
    Array.isArray(route.params.id) ? route.params.id[0] : route.params.id
  )
}

const errorMessage = (error: {}, message: string) =>
  'reason' in error ? (error.reason as string) : message

const isBodAction = () => false
//#region

//#region Watchers
watch(errorAddExpenseData, (newVal) => {
  if (newVal) {
    addErrorToast(errorMessage(newVal, 'Error Adding Expense Data'))
    log.error('errorAddExpenseData.value', parseError(newVal))
    loadingApprove.value = false
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
//#endregion
</script>
