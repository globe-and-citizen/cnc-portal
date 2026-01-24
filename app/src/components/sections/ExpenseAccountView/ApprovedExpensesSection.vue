<template>
  <CardComponent title="Approved Addresses" data-test="claims-table">
    <template #card-action>
      <div :class="{ tooltip: !(userDataStore.address === contractOwnerAddress || isBodAction()) }" :data-tip="!(userDataStore.address === contractOwnerAddress || isBodAction())
        ? 'Only the contract owner can approve expenses'
        : null
        ">
        <ButtonUI variant="success" :disabled="!(userDataStore.address === contractOwnerAddress || isBodAction())"
          @click="
            () => {
              approveUsersModal = { mount: true, show: true }
            }
          " data-test="approve-users-button">
          Approve User Expense
        </ButtonUI>
      </div>
    </template>

    <ExpenseAccountTable />

    <ModalComponent v-model="approveUsersModal.show" v-if="approveUsersModal.mount" @reset="
      () => {
        approveUsersModal = { mount: false, show: false }
      }
    ">
      <ApproveUsersForm v-if="approveUsersModal.mount" :form-data="teamMembers" :users="foundUsers"
        :loading-approve="loadingApprove" :is-bod-action="isBodAction()" @approve-user="
          (data: BudgetLimit) => {
            approveData = data
            confirmationModal = true
          }
        " @close-modal="approveUsersModal = { mount: false, show: false }" />
    </ModalComponent>

    <ModalComponent v-model="confirmationModal">
      <ApproveExpenseSummaryForm v-if="confirmationModal" :budget-limit="approveData!" :loading="loadingApprove"
        @submit="approveUser" @close="confirmationModal = false" />
    </ModalComponent>
  </CardComponent>
</template>
<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import ButtonUI from '@/components/ButtonUI.vue'
import ModalComponent from '@/components/ModalComponent.vue'
import CardComponent from '@/components/CardComponent.vue'
import ExpenseAccountTable from '@/components/sections/ExpenseAccountView/ExpenseAccountTable.vue'
import ApproveUsersForm from '@/components/forms/ApproveUsersEIP712Form.vue'
import { useUserDataStore, useToastStore, useTeamStore } from '@/stores'
import { useRoute } from 'vue-router'
import { useReadContract, useChainId, useSignTypedData } from '@wagmi/vue'
import { parseEther, zeroAddress, type Address } from 'viem'
import { EXPENSE_ACCOUNT_EIP712_ABI } from '@/artifacts/abi/expense-account-eip712'
import type { User, BudgetLimit } from '@/types'
import { log, parseError } from '@/utils'
import ApproveExpenseSummaryForm from '@/components/forms/ApproveExpenseSummaryForm.vue'
import { useAddExpenseMutation } from '@/queries/expense.queries'

const confirmationModal = ref(false)
const approveUsersModal = ref({ mount: false, show: false })
const foundUsers = ref<User[]>([])
const teamMembers = ref([{ name: '', address: '', isValid: false }])
const loadingApprove = ref(false)
const approveData = ref<BudgetLimit>()

const teamStore = useTeamStore()
const userDataStore = useUserDataStore()
const { addErrorToast } = useToastStore()
const route = useRoute()
const chainId = useChainId()
const { signTypedDataAsync, data: signature, error: signTypedDataError } = useSignTypedData()
const { mutateAsync: addExpenseData, error: errorAddExpenseData } = useAddExpenseMutation()

const expenseAccountEip712Address = computed(
  () => teamStore.getContractAddressByType('ExpenseAccountEIP712') as Address
)

const {
  data: contractOwnerAddress,
  refetch: refetchExpenseAccountGetOwner,
  error: errorGetOwner
} = useReadContract({
  functionName: 'owner',
  address: expenseAccountEip712Address,
  abi: EXPENSE_ACCOUNT_EIP712_ABI,
  query: {
    staleTime: Infinity,
  }
})

//#region Functions
const approveUser = async (data: BudgetLimit) => {
  loadingApprove.value = true
  const verifyingContract = expenseAccountEip712Address.value

  const domain = {
    name: 'CNCExpenseAccount',
    version: '1',
    chainId: chainId.value,
    verifyingContract: verifyingContract as Address
  }
  // const types = {
  //   BudgetData: [
  //     { name: 'budgetType', type: 'uint8' },
  //     { name: 'value', type: 'uint256' }
  //   ],
  //   BudgetLimit: [
  //     { name: 'approvedAddress', type: 'address' },
  //     { name: 'budgetData', type: 'BudgetData[]' },
  //     { name: 'expiry', type: 'uint256' },
  //     { name: 'tokenAddress', type: 'address' }
  //   ]
  // }

  const types = {
    BudgetLimit: [
      { name: 'amount', type: 'uint256' },
      { name: 'frequencyType', type: 'uint8' },
      { name: 'customFrequency', type: 'uint256' },
      { name: 'startDate', type: 'uint256' },
      { name: 'endDate', type: 'uint256' },
      { name: 'tokenAddress', type: 'address' },
      { name: 'approvedAddress', type: 'address' }
    ]
  }

  const message = {
    ...data,
    amount:
      data.tokenAddress === zeroAddress
        ? parseEther(`${data.amount}`)
        : BigInt(Number(data.amount) * 1e6),
    frequencyType: Number(data.frequencyType),
    customFrequency: BigInt(Number(data.customFrequency)),
    startDate: Number(data.startDate),
    endDate: Number(data.endDate)
  }

  await signTypedDataAsync({
    types,
    primaryType: 'BudgetLimit',
    message,
    domain
  })

  const expenseAccountData = {
    data,
    signature: signature.value,
    teamId: route.params.id
  }
  await addExpenseData(expenseAccountData)
  await refetchExpenseAccountGetOwner()
  loadingApprove.value = false
  approveUsersModal.value = { mount: false, show: false }
  confirmationModal.value = false
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
