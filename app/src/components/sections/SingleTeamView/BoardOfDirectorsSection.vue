<template>
  <div>
    <div class="flex flex-row items-center gap-2">
      <h2 class="text-2xl font-bold">Board of Directors</h2>
      <ToolTip content="To change the board of directors you need to do an election">
        <InformationCircleIcon data-test="information-icon" class="size-6" />
      </ToolTip>
    </div>
    <div class="flex flex-col gap-8 my-4">
      <SkeletonLoading v-if="isLoading" class="w-full h-48" />
      <div v-if="boardOfDirectors?.length == 0 && !isLoading" class="text-red-600 font-bold">
        You must add board of directors by doing election voting from proposal
      </div>
      <div id="list-bod">
        <div v-if="(boardOfDirectors?.length ?? 0) > 0 && !isLoading">
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
                    bankOwner == team.boardOfDirectorsAddress
                      ? 'Board of Directors Contract'
                      : (team.members?.filter((member) => member.address == bankOwner)[0]?.name ??
                        'Unknown')
                  }})
                </h4>
              </td>
              <td class="flex justify-end">
                <LoadingButton
                  data-test="loading-bank-transfer"
                  v-if="loadingTransferOwnership"
                  color="primary"
                  class="w-48"
                />
                <button
                  data-test="transfer-expense-ownership-button"
                  v-if="
                    bankOwner == currentAddress &&
                    bankOwner != team.boardOfDirectorsAddress &&
                    !loadingTransferOwnership
                  "
                  class="btn btn-primary"
                  @click="async () => await executeTransferOwnership(team.boardOfDirectorsAddress!)"
                >
                  Transfer bank ownership
                </button>
              </td>
            </tr>
            <tr v-if="team.expenseAccountAddress">
              <td>Expense A/c</td>
              <td>
                <SkeletonLoading v-if="isLoadingExpenseOwner" class="w-full h-6" />
                <h4>
                  {{ expenseOwner }} ({{
                    expenseOwner == team.boardOfDirectorsAddress
                      ? 'Board of Directors Contract'
                      : (team.members?.filter((member) => member.address == expenseOwner)[0]
                          ?.name ?? 'Unknown')
                  }})
                </h4>
              </td>
              <td class="flex justify-end">
                <LoadingButton
                  v-if="loadingTransferExpenseOwnership"
                  color="primary"
                  class="w-48"
                />
                <button
                  v-if="
                    expenseOwner == currentAddress &&
                    expenseOwner != team.boardOfDirectorsAddress &&
                    !loadingTransferExpenseOwnership
                  "
                  class="btn btn-primary"
                  @click="async () => await transferExpenseOwnership(team.boardOfDirectorsAddress!)"
                >
                  Transfer expense ownership
                </button>
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
import LoadingButton from '@/components/LoadingButton.vue'
import ToolTip from '@/components/ToolTip.vue'
import BoDAction from '@/components/sections/SingleTeamView/BoDActions.vue'
import { InformationCircleIcon } from '@heroicons/vue/24/outline'
import { useToastStore } from '@/stores/useToastStore'
import { useUserDataStore } from '@/stores/user'
import type { Team } from '@/types'
import { onMounted, watch } from 'vue'
import type { Address } from 'viem'
import {
  useExpenseAccountTransferOwnership,
  useExpenseAccountGetOwner
} from '@/composables/useExpenseAccount'

import { useBankTransferOwnership } from '@/composables/bank'
import { useReadContract } from '@wagmi/vue'
import BankABI from '@/artifacts/abi/bank.json'
import BoDABI from '@/artifacts/abi/bod.json'

const props = defineProps<{
  team: Partial<Team>
}>()

const {
  data: bankOwner,
  isLoading: isLoadingBankOwner,
  error: errorBankOwner,
  refetch: executeBankOwner
} = useReadContract({
  functionName: 'owner',
  address: props.team.bankAddress! as Address,
  abi: BankABI
})

const {
  data: expenseOwner,
  isLoading: isLoadingExpenseOwner,
  error: errorExpenseOwner,
  execute: executeGetExpenseOwner
} = useExpenseAccountGetOwner()

const {
  data: boardOfDirectors,
  error,
  isLoading,
  refetch: executeGetBoardOfDirectors
} = useReadContract({
  functionName: 'getBoardOfDirectors',
  address: props.team.boardOfDirectorsAddress as Address,
  abi: BoDABI
})

const {
  error: errorTransferOwnership,
  execute: transferBankOwnership,
  isLoading: loadingTransferOwnership
} = useBankTransferOwnership(props.team.bankAddress!)

const {
  error: errorTransferExpenseOwnership,
  execute: transferExpenseOwnership,
  isLoading: loadingTransferExpenseOwnership,
  isSuccess: successTransferExpenseOwnerShip
} = useExpenseAccountTransferOwnership(props.team.expenseAccountAddress!)

const { addErrorToast, addSuccessToast } = useToastStore()
const currentAddress = useUserDataStore().address

const executeTransferOwnership = async (newOwner: string) => {
  await transferBankOwnership(newOwner)
  await executeBankOwner()
}

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
watch(successTransferExpenseOwnerShip, async (newVal) => {
  if (newVal) {
    addSuccessToast('Successfully transfered Expense A/c ownership')
    await executeGetExpenseOwner(props.team.expenseAccountAddress!)
  }
})

onMounted(async () => {
  await executeGetBoardOfDirectors()
  await executeBankOwner()
  if (props.team.expenseAccountAddress)
    await executeGetExpenseOwner(props.team.expenseAccountAddress)
})
</script>
