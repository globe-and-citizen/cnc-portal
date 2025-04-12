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

      <ButtonUI
        :loading="
          isPaused ? loadingUnpause || isConfirmingUnpause : loadingPause || isConfirmingPause
        "
        :disabled="
          isPaused ? loadingUnpause || isConfirmingUnpause : loadingPause || isConfirmingPause
        "
        class="btn btn-primary row-start-2"
        @click="
          isPaused
            ? unpause({
                functionName: 'unpause',
                args: [],
                abi: VotingABI,
                address: votingAddress
              })
            : pause({
                functionName: 'pause',
                args: [],
                abi: VotingABI,
                address: votingAddress
              })
        "
      >
        {{ isPaused ? 'Unpause' : 'Pause' }}
      </ButtonUI>
    </div>

    <div class="text-center flex flex-col gap-y-4 items-center">
      <div>
        <div class="font-bold text-md">Owner</div>
        <div v-if="!loadingOwner" data-test="owner" class="badge badge-secondary">{{ owner }}</div>
      </div>
      <SkeletonLoading v-if="loadingOwner" class="w-96 h-6" />

      <div class="flex flex-row gap-x-4 justify-around w-full">
        <ButtonUI
          class="btn btn-primary w-40 text-center"
          data-test="transfer-ownership"
          @click="transferOwnershipModal = true"
        >
          Transfer Ownership
        </ButtonUI>
        <ButtonUI
          variant="primary"
          class="w-1/2"
          :loading="transferOwnershipLoading"
          :disabled="transferOwnershipLoading"
          data-test="transfer-to-board-of-directors"
          @click="
            transferOwnership({
              functionName: 'transferOwnership',
              args: [boardOfDirectorsAddress],
              abi: VotingABI,
              address: votingAddress
            })
          "
        >
          Transfer to Board Of <br />
          Directors Contract
        </ButtonUI>
      </div>
    </div>
  </div>
  <ModalComponent v-model="transferOwnershipModal">
    <TransferOwnershipForm
      v-if="transferOwnershipModal"
      @transferOwnership="
        async (newOwner: string) => {
          transferOwnership({
            functionName: 'transferOwnership',
            args: [newOwner],
            abi: VotingABI,
            address: votingAddress as Address
          })
        }
      "
      :transferOwnershipLoading="transferOwnershipLoading || isConfirmingTransferOwnership"
    />
  </ModalComponent>
</template>
<script setup lang="ts">
import { useToastStore } from '@/stores/useToastStore'
import TransferOwnershipForm from '@/components/sections/AdministrationView/forms/TransferOwnershipForm.vue'
import type { Team } from '@/types'
import { computed, onMounted, ref, watch } from 'vue'
import SkeletonLoading from '@/components/SkeletonLoading.vue'
import ModalComponent from '@/components/ModalComponent.vue'
import { useReadContract, useWaitForTransactionReceipt, useWriteContract } from '@wagmi/vue'
import VotingABI from '@/artifacts/abi/voting.json'
import type { Address } from 'viem'
import ButtonUI from '@/components/ButtonUI.vue'

const transferOwnershipModal = ref(false)

const props = defineProps<{
  team: Partial<Team>
}>()

const votingAddress = computed(() => {
  const address = props.team.teamContracts?.find((contract) => contract.type === 'Voting')?.address
  return address as Address
})

const boardOfDirectorsAddress = computed(() => {
  const address = props.team.teamContracts?.find(
    (contract) => contract.type === 'BoardOfDirectors'
  )?.address
  return address as Address
})

const { addErrorToast, addSuccessToast } = useToastStore()
const {
  data: isPaused,
  error: errorPaused,
  refetch: getIsPaused,
  isLoading: loadingPaused
} = useReadContract({
  address: votingAddress,
  functionName: 'paused',
  abi: VotingABI
})

const {
  data: owner,
  error: errorOwner,
  isLoading: loadingOwner,
  refetch: getOwner
} = useReadContract({
  address: votingAddress,
  functionName: 'owner',
  abi: VotingABI
})

const {
  isPending: loadingPause,
  writeContract: pause,
  error: errorPause,
  data: hashPause
} = useWriteContract()
const { isLoading: isConfirmingPause, isSuccess: isConfirmedPause } = useWaitForTransactionReceipt({
  hash: hashPause
})
watch(isConfirmingPause, (isConfirming, wasConfirming) => {
  if (wasConfirming && !isConfirming && isConfirmedPause.value) {
    addSuccessToast('Voting paused successfully')
    getIsPaused()
  }
})

const {
  writeContract: unpause,
  error: unpauseError,
  isPending: loadingUnpause,
  data: hashUnpause
} = useWriteContract()
const { isLoading: isConfirmingUnpause, isSuccess: isConfirmedUnPause } =
  useWaitForTransactionReceipt({
    hash: hashUnpause
  })
watch(isConfirmingUnpause, (isConfirming, wasConfirming) => {
  if (wasConfirming && !isConfirming && isConfirmedUnPause.value) {
    addSuccessToast('Voting unpaused successfully')
    getIsPaused()
  }
})

const {
  writeContract: transferOwnership,
  error: transferOwnershipError,
  isPending: transferOwnershipLoading,
  data: transferOwnershipHash
} = useWriteContract()
const { isLoading: isConfirmingTransferOwnership, isSuccess: isConfirmedTransferOwnership } =
  useWaitForTransactionReceipt({
    hash: transferOwnershipHash
  })
watch(isConfirmingTransferOwnership, (isConfirming, wasConfirming) => {
  if (wasConfirming && !isConfirming && isConfirmedTransferOwnership.value) {
    addSuccessToast('Ownership transferred successfully')
    getOwner()
    transferOwnershipModal.value = false
  }
})
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
    addErrorToast('Failed to pause voting contract')
  }
})

watch(unpauseError, () => {
  if (unpauseError.value) {
    addErrorToast('Failed to unpause voting contract')
  }
})

watch(transferOwnershipError, () => {
  if (transferOwnershipError.value) {
    addErrorToast('Failed to transfer ownership')
  }
})

onMounted(async () => {
  await getIsPaused()
  await getOwner()
})
</script>
