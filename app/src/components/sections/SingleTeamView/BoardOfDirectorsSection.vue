<template>
  <div>
    <h2 class="text-2xl font-bold">Board of Directors</h2>
    <div class="my-4">
      <div id="list-bod">
        <SkeletonLoading v-if="isLoading" class="w-full h-48" />
        <div v-if="boardOfDirectors?.length == 0 && !isLoading">
          You must add board of directors by doing election voting from proposal
        </div>
        <div v-if="(boardOfDirectors?.length ?? 0) > 0 && !isLoading">
          <div class="overflow-x-auto">
            <table class="table table-zebra">
              <!-- head -->
              <thead>
                <tr>
                  <th>No</th>
                  <th>Name</th>
                  <th>Address</th>
                </tr>
              </thead>
              <tbody>
                <!-- row 1 -->
                <tr v-for="(boardOfDirector, index) in boardOfDirectors">
                  <th>{{ index + 1 }}</th>
                  <td>
                    {{
                      team.members?.filter((member) => member.address == boardOfDirector)[0].name ??
                      'Unknown'
                    }}
                  </td>
                  <td>{{ boardOfDirector }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="flex justify-center mt-4">
        <button
          v-if="bankOwner == currentAddress && bankOwner != team.boardOfDirectorsAddress"
          class="btn btn-primary"
        >
          Transfer bank ownership
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import SkeletonLoading from '@/components/SkeletonLoading.vue'
import { useBankOwner } from '@/composables/bank'
import { useGetBoardOfDirectors } from '@/composables/bod'
import { useCustomFetch } from '@/composables/useCustomFetch'
import { useToastStore } from '@/stores/useToastStore'
import { useUserDataStore } from '@/stores/user'
import type { Team } from '@/types'
import { useReadContract } from '@wagmi/vue'
import { onMounted, watch } from 'vue'
import { BOD_ABI } from '@/artifacts/abi/bod'
import type { Address } from 'viem'

const props = defineProps<{
  team: Partial<Team>
}>()

// const {
//   execute: executeGetBoardOfDirectors,
//   boardOfDirectors,
//   error,
//   isLoading
// } = useGetBoardOfDirectors()

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
  execute: executeBankOwner,
  isLoading: isLoadingBankOwner,
  data: bankOwner,
  error: errorBankOwner
} = useBankOwner(props.team.bankAddress!)

const { addErrorToast } = useToastStore()
const currentAddress = useUserDataStore().address

watch(error, () => {
  if (error.value) {
    console.log(error.value)
    addErrorToast('Failed to get board of directors')
  }
})

onMounted(() => {
  executeBankOwner()
  // executeGetBoardOfDirectors(props.team.boardOfDirectorsAddress!)
})
</script>
