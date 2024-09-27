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
      <div v-if="boardOfDirectors?.length == 0 && !isLoading">
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
      <SkeletonLoading v-if="isLoadingBankOwner" class="w-full h-6" />
      <h4>
        <span class="font-bold">Bank Contract Owner</span>: {{ bankOwner }} ({{
          bankOwner == team.boardOfDirectorsAddress
            ? 'Board of Directors Contract'
            : (team.members?.filter((member) => member.address == bankOwner)[0]?.name ?? 'Unknown')
        }})
      </h4>

      <div class="flex justify-center">
        <LoadingButton v-if="status === 'pending'" color="primary" class="w-48" />
        <button
          v-if="
            bankOwner == currentAddress &&
            bankOwner != team.boardOfDirectorsAddress &&
            status != 'pending'
          "
          class="btn btn-primary"
          @click="transferBankOwnership"
        >
          Transfer bank ownership
        </button>
      </div>
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
import { useReadContract, useWriteContract } from '@wagmi/vue'
import { watch } from 'vue'
import { BOD_ABI } from '@/artifacts/abi/bod'
import { BANK_ABI } from '@/artifacts/abi/bank'
import type { Address } from 'viem'

const props = defineProps<{
  team: Partial<Team>
}>()

const {
  data: boardOfDirectors,
  error,
  isLoading
} = useReadContract({
  abi: BOD_ABI,
  address: props.team.boardOfDirectorsAddress! as Address,
  functionName: 'getBoardOfDirectors'
})
const {
  data: bankOwner,
  isLoading: isLoadingBankOwner,
  error: errorBankOwner,
  refetch: refetchBankOwner
} = useReadContract({
  abi: BANK_ABI,
  address: props.team.bankAddress! as Address,
  functionName: 'owner'
})

const { writeContract, status } = useWriteContract()
const { addErrorToast } = useToastStore()
const currentAddress = useUserDataStore().address

const transferBankOwnership = () => {
  writeContract({
    abi: BANK_ABI,
    address: props.team.bankAddress! as Address,
    functionName: 'transferOwnership',
    args: [props.team.boardOfDirectorsAddress! as Address]
  })
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
watch(status, () => {
  if (status.value === 'success') {
    refetchBankOwner()
  }
})
</script>
