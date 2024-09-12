<template>
  <div class="flex flex-col gap-4">
    <div class="text-center border-b-2 text-md font-bold" data-test="title">
      Manage Voting Contract
    </div>
    <div class="flex flex-col justify-center items-center">
      <SkeletonLoading v-if="loadingPaused" class="w-40 h-12" />
      <h3 v-if="!loadingPaused" class="font-bold text-md" data-test="status">
        Status: {{ isPaused ? 'Paused' : 'Active' }}
      </h3>
      <LoadingButton color="primary" v-if="isPaused ? loadingUnpause : loadingPause" />
      <button
        v-if="isPaused ? !loadingUnpause : !loadingPause"
        class="btn btn-primary row-start-2"
        @click="isPaused ? executeFunction(unpause) : executeFunction(pause)"
      >
        {{ isPaused ? 'Unpause' : 'Pause' }}
      </button>
    </div>

    <div class="text-center flex flex-col gap-y-4 items-center">
      <div>
        <div class="font-bold text-md">Owner</div>
        <div v-if="!loadingOwner" data-test="owner" class="badge badge-secondary">{{ owner }}</div>
      </div>
      <SkeletonLoading v-if="loadingOwner" class="w-96 h-6" />

      <div class="flex flex-row gap-x-4 justify-around w-full">
        <button
          class="btn btn-primary w-40 text-center"
          data-test="transfer-ownership"
          @click="transferOwnershipModal = true"
        >
          Transfer Ownership
        </button>
        <LoadingButton v-if="transferOwnershipLoading" class="w-44" color="primary" />
        <button
          class="btn btn-primary w-44 text-center"
          data-test="transfer-to-board-of-directors"
          v-if="team.boardOfDirectorsAddress && !transferOwnershipLoading"
          @click="executeFunction(transferOwnership, [team.boardOfDirectorsAddress])"
        >
          Transfer to Board Of Directors Contract
        </button>
      </div>
    </div>
  </div>
  <ModalComponent v-model="transferOwnershipModal">
    <TransferOwnershipForm
      v-if="transferOwnershipModal"
      @transferOwnership="
        async (newOwner: string) => executeFunction(transferOwnership, [newOwner])
      "
      :transferOwnershipLoading="transferOwnershipLoading"
    />
  </ModalComponent>
</template>
<script setup lang="ts">
import {
  useVotingContractOwner,
  useVotingContractPause,
  useVotingContractStatus,
  useVotingContractTransferOwnership,
  useVotingContractUnpause
} from '@/composables/voting'
import { useToastStore } from '@/stores/useToastStore'
import TransferOwnershipForm from '@/components/sections/SingleTeamView/forms/TransferOwnershipForm.vue'
import type { Team } from '@/types'
import { onMounted, ref, watch } from 'vue'
import { useUserDataStore } from '@/stores/user'
import LoadingButton from '@/components/LoadingButton.vue'
import SkeletonLoading from '@/components/SkeletonLoading.vue'
import ModalComponent from '@/components/ModalComponent.vue'

const transferOwnershipModal = ref(false)

const { address: currentUserAddress } = useUserDataStore()

const props = defineProps<{
  team: Partial<Team>
}>()

const { addErrorToast, addSuccessToast } = useToastStore()
const {
  data: isPaused,
  error: errorPaused,
  execute: getIsPaused,
  isLoading: loadingPaused
} = useVotingContractStatus(props.team.votingAddress!)

const {
  data: owner,
  error: errorOwner,
  isLoading: loadingOwner,
  execute: getOwner
} = useVotingContractOwner(props.team.votingAddress!)

const {
  isLoading: loadingPause,
  execute: pause,
  error: errorPause,
  isSuccess: successPause
} = useVotingContractPause(props.team.votingAddress!)

const {
  execute: unpause,
  error: unpauseError,
  isLoading: loadingUnpause,
  isSuccess: unpauseSuccess
} = useVotingContractUnpause(props.team.votingAddress!)

const {
  execute: transferOwnership,
  error: transferOwnershipError,
  isLoading: transferOwnershipLoading,
  isSuccess: transferOwnershipSuccess
} = useVotingContractTransferOwnership(props.team.votingAddress!)
watch(errorPaused, () => {
  if (errorPaused.value) {
    addErrorToast('Failed to get voting contract status')
  }
})

watch(errorOwner, () => {
  if (errorOwner.value) {
    addErrorToast('Failed to get voting contract owner')
  }
})

watch(errorPause, () => {
  if (errorPause.value) {
    console.log(errorPause.value)
    addErrorToast('Failed to pause voting contract')
  }
})

watch(successPause, async () => {
  if (successPause.value) {
    addSuccessToast('Voting contract paused successfully')
    await getIsPaused()
  }
})

watch(unpauseError, () => {
  if (unpauseError.value) {
    addErrorToast('Failed to unpause voting contract')
  }
})

watch(unpauseSuccess, async () => {
  if (unpauseSuccess.value) {
    addSuccessToast('Voting contract unpaused successfully')
    await getIsPaused()
  }
})

watch(transferOwnershipError, () => {
  if (transferOwnershipError.value) {
    addErrorToast('Failed to transfer ownership')
  }
})

watch(transferOwnershipSuccess, async () => {
  if (transferOwnershipSuccess.value) {
    await getOwner()
    transferOwnershipModal.value = false
    addSuccessToast('Voting contract ownership transferred successfully')
  }
})
const executeFunction = async (execute: Function, args: string[] = []) => {
  if (currentUserAddress !== owner.value) {
    addErrorToast('You are not the owner of this voting contract')
    return
  }
  if (args.length === 0) {
    await execute()
  } else {
    await execute(...args)
  }
}
onMounted(async () => {
  await getIsPaused()
  await getOwner()
})
</script>
