<template>
  <div>
    <div class="flex flex-row items-center gap-2">
      <h2 class="text-2xl font-bold">Board of Directors</h2>
      <ToolTip content="To change the board of directors you need to do an election">
        <InformationCircleIcon class="size-6" />
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
                  <td>
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
            <td>
              Bank
            </td>
            <td>
              <SkeletonLoading v-if="isLoadingBankOwner" class="w-full h-6" />
              <h4>
                {{ bankOwner }} ({{
                  bankOwner == team.boardOfDirectorsAddress
                    ? 'Board of Directors Contract'
                    : (team.members?.filter((member) => member.address == bankOwner)[0]?.name ?? 'Unknown')
                }})
              </h4>
            </td>
            <td class="flex justify-end">
              <LoadingButton 
                v-if="loadingTransferOwnership" 
                color="primary" 
                class="w-48" 
              />
              <button
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
            <td>
              Expense A/c
            </td>
            <td>
              <SkeletonLoading v-if="isLoadingExpenseOwner" class="w-full h-6" />
              <h4>
                {{ expenseOwner }} ({{
                  expenseOwner == team.boardOfDirectorsAddress
                    ? 'Board of Directors Contract'
                    : (team.members?.filter((member) => member.address == bankOwner)[0]?.name ?? 'Unknown')
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
                @click="async () => await transferExpenseOwnership(team.expenseAccountAddress!)"
              >
                Transfer expense ownership
              </button>
            </td>
          </tr>
        </tbody>
        </table>
      </div>
      <!-- End Contract Owners Table -->
      <!--<SkeletonLoading v-if="isLoadingBankOwner" class="w-full h-6" />
      <h4>
        <span class="font-bold">Bank Contract Owner</span>: {{ bankOwner }} ({{
          bankOwner == team.boardOfDirectorsAddress
            ? 'Board of Directors Contract'
            : (team.members?.filter((member) => member.address == bankOwner)[0]?.name ?? 'Unknown')
        }})
      </h4>

      <div class="flex justify-center">
        <LoadingButton v-if="loadingTransferOwnership" color="primary" class="w-48" />
        <button
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
      </div>-->
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
import  EXPENSE_ABI from '@/artifacts/abi/expense-account.json'
import type { Address } from 'viem'
import { ref } from 'vue'
import { useReadContract, useWriteContract } from '@wagmi/vue'
import { useExpenseAccountTransferOwnership } from '@/composables/useExpenseAccount'

const writingContract = ref<string | null | undefined>('')
import { useBankOwner, useBankTransferOwnership } from '@/composables/bank'
import { useGetBoardOfDirectors } from '@/composables/bod'

const props = defineProps<{
  team: Partial<Team>
}>()

const {
  data: bankOwner,
  isLoading: isLoadingBankOwner,
  error: errorBankOwner,
  execute: executeBankOwner
} = useBankOwner(props.team.bankAddress!)

const {
  boardOfDirectors,
  error,
  isLoading,
  execute: executeGetBoardOfDirectors
} = useGetBoardOfDirectors()
const {
  data: expenseOwner,
  isLoading: isLoadingExpenseOwner,
  error: errorExpenseOwner,
  refetch: refetchExpenseOwner
} = useReadContract({
  abi: EXPENSE_ABI,
  address: props.team.expenseAccountAddress as Address,
  functionName: 'owner'
})

const {
  error: errorTransferOwnership,
  execute: transferBankOwnership,
  isLoading: loadingTransferOwnership
} = useBankTransferOwnership(props.team.bankAddress!)

const {
  error: errorTransferExpenseOwnership,
  execute: transferExpenseOwnership,
  isLoading: loadingTransferExpenseOwnership
} = useExpenseAccountTransferOwnership(props.team.expenseAccountAddress!)

const { writeContract, status } = useWriteContract()
const { addErrorToast } = useToastStore()
const currentAddress = useUserDataStore().address

const executeTransferOwnership = async (newOwner: string) => {
  writingContract.value = props.team.bankAddress
  await transferBankOwnership(newOwner)
  await executeBankOwner()
  writingContract.value = null
}

// const transferExpenseOwnership = async () => {
//   writingContract.value = props.team.expenseAccountAddress
//   console.log(`writingContract.value`, writingContract.value)
//   console.log(`props.team.expenseAccountAddress`, writingContract.value === props.team.expenseAccountAddress)
//   writeContract({
//     abi: EXPENSE_ABI,
//     address: props.team.expenseAccountAddress as Address,
//     functionName: 'transferOwnership',
//     args: [props.team.boardOfDirectorsAddress! as Address]
//   })
//   writingContract.value = null
// }

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

onMounted(async () => {
  await executeGetBoardOfDirectors(props.team.boardOfDirectorsAddress!)
  await executeBankOwner()
})
</script>
