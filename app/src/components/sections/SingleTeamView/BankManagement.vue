<template>
  <div class="flex flex-col">
    <h2 class="text-center border-b-2 border-black pb-10" data-test="title">Manage Bank</h2>
    <div class="flex flex-row gap-y-4 my-4">
      <div class="flex flex-row justify-around w-full">
        <div class="grid grid-rows-subgrid row-span-2 gap-y-4">
          <SkeletonLoading v-if="loadingPaused" class="w-40 h-12" />
          <h3 v-if="!loadingPaused" class="font-bold text-xl" data-test="status">
            Status: {{ isPaused ? 'Paused' : 'Active' }}
          </h3>
          <LoadingButton color="primary" v-if="isPaused ? loadingUnpause : loadingPause" />
          <button
            v-if="isPaused ? !loadingUnpause : !loadingPause"
            class="btn btn-primary row-start-2"
            @click="isPaused ? executeBank(unpause) : executeBank(pause)"
          >
            {{ isPaused ? 'Unpause' : 'Pause' }}
          </button>
        </div>

        <div class="text-center flex flex-col gap-y-4 items-center">
          <div>
            <h3 class="font-bold text-xl">Owner</h3>
            <h3 v-if="!loadingOwner">{{ owner }}</h3>
          </div>
          <SkeletonLoading v-if="loadingOwner" class="w-96 h-6" />

          <div class="flex flex-row gap-x-4 justify-around w-full">
            <button class="btn btn-primary w-40 text-center" @click="transferOwnershipModal = true">
              Transfer Ownership
            </button>
            <LoadingButton v-if="transferOwnershipLoading" class="w-44" color="primary" />
            <button
              class="btn btn-primary w-44 text-center"
              data-test="transfer-to-board-of-directors"
              v-if="team.boardOfDirectorsAddress && !transferOwnershipLoading"
              @click="executeBank(transferOwnership, [team.boardOfDirectorsAddress])"
            >
              Transfer to Board Of Directors Contract
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
  <ModalComponent v-model="transferOwnershipModal">
    <TransferOwnershipForm
      v-if="transferOwnershipModal"
      @transferOwnership="async (newOwner: string) => executeBank(transferOwnership, [newOwner])"
      :transferOwnershipLoading="transferOwnershipLoading"
    />
  </ModalComponent>
</template>

<script setup lang="ts">
import LoadingButton from '@/components/LoadingButton.vue'
import SkeletonLoading from '@/components/SkeletonLoading.vue'
import ModalComponent from '@/components/ModalComponent.vue'
import TransferOwnershipForm from '@/components/sections/SingleTeamView/forms/TransferOwnershipForm.vue'
import {
  useBankStatus,
  useBankOwner,
  useBankPause,
  useBankUnpause,
  useBankTransferOwnership
} from '@/composables/bank'
import { useToastStore } from '@/stores/useToastStore'
import { useUserDataStore } from '@/stores/user'
import type { Team } from '@/types'
import { onMounted, ref, watch } from 'vue'

const { addErrorToast, addSuccessToast } = useToastStore()
const { address: currentUserAddress } = useUserDataStore()
const transferOwnershipModal = ref(false)

const props = defineProps<{
  team: Partial<Team>
}>()

const {
  data: isPaused,
  error: errorPaused,
  execute: getIsPaused,
  isLoading: loadingPaused
} = useBankStatus(props.team.bankAddress!)

const {
  data: owner,
  error: errorOwner,
  isLoading: loadingOwner,
  execute: getOwner
} = useBankOwner(props.team.bankAddress!)

const {
  isLoading: loadingPause,
  execute: pause,
  error: errorPause,
  isSuccess: successPause
} = useBankPause(props.team.bankAddress!)

const {
  execute: unpause,
  error: unpauseError,
  isLoading: loadingUnpause,
  isSuccess: unpauseSuccess
} = useBankUnpause(props.team.bankAddress!)

const {
  execute: transferOwnership,
  error: transferOwnershipError,
  isLoading: transferOwnershipLoading,
  isSuccess: transferOwnershipSuccess
} = useBankTransferOwnership(props.team.bankAddress!)

const executeBank = async (execute: Function, args: any[] = []) => {
  if (currentUserAddress !== owner.value) {
    addErrorToast('You are not the owner of this bank')
    return
  }
  if (args.length === 0) {
    await execute()
  } else {
    await execute(...args)
  }
}

watch(errorPaused, () => {
  if (errorPaused.value) {
    addErrorToast('Failed to get bank status')
  }
})

watch(errorOwner, () => {
  if (errorOwner.value) {
    addErrorToast('Failed to get bank owner')
  }
})

watch(errorPause, () => {
  if (errorPause.value) {
    addErrorToast('Failed to pause bank')
  }
})

watch(successPause, async () => {
  if (successPause.value) {
    addSuccessToast('Bank paused successfully')
    await getIsPaused()
  }
})

watch(unpauseError, () => {
  if (unpauseError.value) {
    addErrorToast('Failed to unpause bank')
  }
})

watch(unpauseSuccess, async () => {
  if (unpauseSuccess.value) {
    addSuccessToast('Bank unpaused successfully')
    await getIsPaused()
  }
})

watch(transferOwnershipError, () => {
  if (transferOwnershipError.value) {
    addErrorToast('Failed to transfer ownership')
  }
})

watch(transferOwnershipSuccess, () => {
  if (transferOwnershipSuccess.value) {
    transferOwnershipModal.value = false
    addSuccessToast('Bank ownership transferred successfully')
  }
})

onMounted(async () => {
  await getIsPaused()
  await getOwner()
})
</script>
