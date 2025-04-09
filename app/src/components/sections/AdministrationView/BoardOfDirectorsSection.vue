<template>
  <div>
    <div class="flex flex-row items-center gap-2">
      <h2 class="text-2xl font-bold">Board of Directors</h2>
      <ToolTip content="To change the board of directors you need to do an election">
        <IconComponent
          icon="heroicons-outline:information-circle"
          class="size-6"
          data-test="information-icon"
        />
      </ToolTip>
    </div>
    <div class="flex flex-col gap-8 my-4">
      <SkeletonLoading v-if="isLoading" class="w-full h-48" />
      <div
        v-if="(boardOfDirectors as Array<string>)?.length == 0 && !isLoading"
        class="text-red-600 font-bold"
      >
        You must add board of directors by doing election voting from proposal
      </div>
      <div id="list-bod">
        <div v-if="((boardOfDirectors as Array<string>)?.length ?? 0) > 0 && !isLoading">
          <div class="overflow-x-auto">
            <table class="table table-zebra text-center">
              <thead>
                <tr>
                  <th>No</th>
                  <th>Name</th>
                  <th>Address</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(boardOfDirector, index) in boardOfDirectors" :key="index" class="hover">
                  <th>{{ index + 1 }}</th>
                  <td :data-test="`bod-member-name${index + 1}`">
                    {{
                      team.members?.filter((member) => member.address == boardOfDirector)[0]
                        ?.name ?? 'Unknown'
                    }}
                  </td>
                  <td>{{ boardOfDirector }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <div class="divider"></div>
      <!-- Start Contract Owners Table -->
      <div class="overflow-x-auto">
        <h2 class="mb-5 text-center">Transfer Ownership (From Founders to Board of Directors)</h2>
        <table class="table table-zebra text-center">
          <thead>
            <tr>
              <th>Contract Name</th>
              <th>Contract Owner</th>
              <th>Transfer Ownership</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Bank</td>
              <td>
                <SkeletonLoading v-if="isLoadingBankOwner" class="w-full h-6" />
                <h4>
                  {{ bankOwner }} ({{
                    bankOwner == boardOfDirectorsAddress
                      ? 'Board of Directors Contract'
                      : (team.members?.filter((member) => member.address == bankOwner)[0]?.name ??
                        'Unknown')
                  }})
                </h4>
              </td>
              <td class="flex justify-end">
                <ButtonUI
                  data-test="transfer-expense-ownership-button"
                  :loading="
                    bankOwner == currentAddress &&
                    bankOwner != boardOfDirectorsAddress &&
                    loadingTransferOwnership &&
                    !isConfirmingTransferOwnership
                  "
                  :disabled="
                    bankOwner == currentAddress &&
                    bankOwner != boardOfDirectorsAddress &&
                    loadingTransferOwnership &&
                    !isConfirmingTransferOwnership
                  "
                  variant="primary"
                  @click="
                    async () =>
                      transferBankOwnership({
                        address: bankAddress,
                        abi: BankABI,
                        functionName: 'transferOwnership',
                        args: [boardOfDirectorsAddress]
                      })
                  "
                >
                  Transfer bank ownership
                </ButtonUI>
              </td>
            </tr>
            <tr v-if="expenseAccountAddress">
              <td>Expense A/c</td>
              <td>
                <SkeletonLoading v-if="isLoadingExpenseOwner" class="w-full h-6" />
                <h4>
                  {{ expenseOwner }} ({{
                    expenseOwner == boardOfDirectorsAddress
                      ? 'Board of Directors Contract'
                      : (team.members?.filter((member) => member.address == expenseOwner)[0]
                          ?.name ?? 'Unknown')
                  }})
                </h4>
              </td>
              <td class="flex justify-end">
                <ButtonUI
                  :loading="
                    expenseOwner == currentAddress &&
                    loadingTransferExpenseOwnership &&
                    !isConfirmingExpenseTransferOwnership
                  "
                  :disabled="
                    expenseOwner == currentAddress &&
                    loadingTransferExpenseOwnership &&
                    !isConfirmingExpenseTransferOwnership
                  "
                  class="btn btn-primary"
                  @click="
                    async () =>
                      transferExpenseOwnership({
                        address: expenseAccountAddress,
                        abi: expenseAccountABI,
                        functionName: 'transferOwnership',
                        args: [boardOfDirectorsAddress]
                      })
                  "
                >
                  Transfer expense ownership
                </ButtonUI>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <!-- End Contract Owners Table -->
      <BoDAction :team="team" :board-of-directors="(boardOfDirectors as Address[]) ?? []" />
    </div>
  </div>
</template>

<script setup lang="ts">
import SkeletonLoading from '@/components/SkeletonLoading.vue'
import ToolTip from '@/components/ToolTip.vue'
import BoDAction from '@/components/sections/AdministrationView/BoDActions.vue'
import IconComponent from '@/components/IconComponent.vue'
import { useToastStore } from '@/stores/useToastStore'
import { useUserDataStore } from '@/stores/user'
import type { Team } from '@/types'
import { computed, onMounted, watch } from 'vue'
import type { Address } from 'viem'

import { useReadContract, useWaitForTransactionReceipt, useWriteContract } from '@wagmi/vue'
import BankABI from '@/artifacts/abi/bank.json'
import BoDABI from '@/artifacts/abi/bod.json'
import expenseAccountABI from '@/artifacts/abi/expense-account.json'
import ButtonUI from '@/components/ButtonUI.vue'

const props = defineProps<{
  team: Team
}>()

const bankAddress = computed(
  () => props.team.teamContracts.find((contract) => contract.type === 'Bank')?.address as Address
)
const expenseAccountAddress = computed(
  () =>
    props.team.teamContracts.find((contract) => contract.type === 'ExpenseAccountEIP712')
      ?.address as Address
)
const boardOfDirectorsAddress = computed(
  () =>
    props.team.teamContracts.find((contract) => contract.type === 'BoardOfDirectors')
      ?.address as Address
)
const {
  data: bankOwner,
  isLoading: isLoadingBankOwner,
  error: errorBankOwner,
  refetch: executeBankOwner
} = useReadContract({
  functionName: 'owner',
  address: bankAddress.value,
  abi: BankABI
})

const {
  data: expenseOwner,
  isLoading: isLoadingExpenseOwner,
  error: errorExpenseOwner,
  refetch: executeGetExpenseOwner
} = useReadContract({
  functionName: 'owner',
  address: expenseAccountAddress.value as Address,
  abi: expenseAccountABI
})

const {
  data: boardOfDirectors,
  error,
  isLoading,
  refetch: executeGetBoardOfDirectors
} = useReadContract({
  functionName: 'getBoardOfDirectors',
  address: boardOfDirectorsAddress.value,
  abi: BoDABI
})

const {
  writeContract: transferBankOwnership,
  error: errorTransferOwnership,
  isPending: loadingTransferOwnership,
  data: hashTransferOwnership
} = useWriteContract()

const { isLoading: isConfirmingTransferOwnership, isSuccess: isConfirmedTransferOwnership } =
  useWaitForTransactionReceipt({
    hash: hashTransferOwnership
  })

watch(isConfirmingTransferOwnership, (isConfirming, wasConfirming) => {
  if (wasConfirming && !isConfirming && isConfirmedTransferOwnership.value) {
    addSuccessToast('Successfully transfered Bank ownership')
    executeBankOwner()
  }
})

const {
  error: errorTransferExpenseOwnership,
  writeContract: transferExpenseOwnership,
  isPending: loadingTransferExpenseOwnership,
  data: transferExpenseOwnershipHash
} = useWriteContract()

const {
  isLoading: isConfirmingExpenseTransferOwnership,
  isSuccess: isConfirmedTransferOwnershipExpense
} = useWaitForTransactionReceipt({
  hash: transferExpenseOwnershipHash
})
watch(isConfirmingExpenseTransferOwnership, (isConfirming, wasConfirming) => {
  if (wasConfirming && !isConfirming && isConfirmedTransferOwnershipExpense.value) {
    addSuccessToast('Successfully transfered Expense A/c ownership')
    executeGetExpenseOwner()
  }
})

const { addErrorToast, addSuccessToast } = useToastStore()
const currentAddress = useUserDataStore().address

watch(error, () => {
  if (error.value) {
    addErrorToast('Failed to get board of directors')
  }
})
watch(errorBankOwner, () => {
  if (errorBankOwner.value) {
    addErrorToast('Failed to get bank owner')
  }
})
watch(errorTransferOwnership, () => {
  if (errorTransferOwnership.value) {
    addErrorToast('Failed to transfer bank ownership')
  }
})
watch(errorExpenseOwner, (newVal) => {
  if (newVal) {
    addErrorToast('Error getting expense owner')
  }
})
watch(errorTransferExpenseOwnership, (newVal) => {
  if (newVal) {
    addErrorToast('Failed to transfer expense ownership')
  }
})

onMounted(async () => {
  await executeGetBoardOfDirectors()
  await executeBankOwner()
  if (expenseAccountAddress.value) await executeGetExpenseOwner()
})
</script>
