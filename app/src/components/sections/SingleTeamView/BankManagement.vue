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
          <LoadingButton
            color="primary"
            v-if="
              isPaused ? loadingUnpause || isConfirmingUnpause : loadingPause || isConfirmingPause
            "
          />
          <button
            v-if="
              isPaused
                ? !loadingUnpause || !isConfirmingUnpause
                : !loadingPause || !isConfirmingPause
            "
            class="btn btn-primary row-start-2"
            :class="{
              'btn-disabled': !isOwner && !isOwnerBod && !isBod
            }"
            @click="
              () => {
                if (isOwnerBod && isBod) {
                  descriptionModal.show = true
                  descriptionModal.actionName = isPaused ? 'Unpause Bank' : 'Pause Bank'
                  descriptionModal.onSubmit = addPauseAction
                } else {
                  isPaused
                    ? unpause({
                        address: props.team.bankAddress! as Address,
                        abi: BankABI,
                        functionName: 'unpause'
                      })
                    : pause({
                        address: props.team.bankAddress! as Address,
                        abi: BankABI,
                        functionName: 'pause'
                      })
                }
              }
            "
          >
            {{ isPaused ? 'Unpause' : 'Pause' }}
          </button>
        </div>

        <div class="text-center flex flex-col gap-y-4 items-center">
          <div>
            <h3 class="font-bold text-xl">Owner</h3>
            <h3 v-if="!loadingOwner" data-test="owner">
              {{ bankOwner }}
              {{ bankOwner == team.boardOfDirectorsAddress ? '(Board Of Directors Contract)' : '' }}
            </h3>
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
              v-if="
                team.boardOfDirectorsAddress &&
                team.boardOfDirectorsAddress != bankOwner &&
                !transferOwnershipLoading
              "
              @click="
                transferOwnership({
                  address: props.team.bankAddress! as Address,
                  abi: BankABI,
                  functionName: 'transferOwnership',
                  args: [team.boardOfDirectorsAddress]
                })
              "
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
      @transferOwnership="
        async (newOwner: string, description: string) => {
          if (bankOwner == team.boardOfDirectorsAddress) {
            addTransferOwnershipAction(newOwner, description)
          } else {
            transferOwnership({
              address: props.team.bankAddress! as Address,
              abi: BankABI,
              functionName: 'transferOwnership',
              args: [newOwner]
            })
          }
        }
      "
      :transferOwnershipLoading="
        transferOwnershipLoading || addActionLoading || isConfirmingTransferOwnership
      "
      :asBod="isOwnerBod && isBod!"
    />
  </ModalComponent>
  <ModalComponent v-if="descriptionModal.show" v-model="descriptionModal.show">
    <DescriptionActionForm
      v-if="descriptionModal.show"
      @submit="
        async () => {
          await descriptionModal.onSubmit()
          descriptionModal.show = false
        }
      "
      v-model:description="description"
      :actionName="descriptionModal.actionName"
      :loading="addActionLoading"
    />
  </ModalComponent>
</template>

<script setup lang="ts">
import LoadingButton from '@/components/LoadingButton.vue'
import SkeletonLoading from '@/components/SkeletonLoading.vue'
import ModalComponent from '@/components/ModalComponent.vue'
import TransferOwnershipForm from '@/components/sections/SingleTeamView/forms/TransferOwnershipForm.vue'
import { useReadContract, useWaitForTransactionReceipt, useWriteContract } from '@wagmi/vue'
import BankABI from '@/artifacts/abi/bank.json'
import { useToastStore } from '@/stores/useToastStore'
import { useUserDataStore } from '@/stores/user'
import type { Team } from '@/types'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import DescriptionActionForm from './forms/DescriptionActionForm.vue'
import { useAddAction } from '@/composables/bod'
import { BankService } from '@/services/bankService'
import type { Address } from 'viem'

const { addErrorToast, addSuccessToast } = useToastStore()
const { address: currentUserAddress } = useUserDataStore()
const transferOwnershipModal = ref(false)
const description = ref('')
const descriptionModal = reactive({
  show: false,
  actionName: '',
  onSubmit: async () => {}
})

const props = defineProps<{
  team: Partial<Team>
  bankOwner: string
  loadingOwner: boolean
  isBod: boolean
}>()
const emits = defineEmits(['getOwner'])

const {
  data: isPaused,
  error: errorPaused,
  isLoading: loadingPaused,
  refetch: getIsPaused
} = useReadContract({
  functionName: 'paused',
  address: props.team.bankAddress! as Address,
  abi: BankABI
})

const {
  isPending: loadingPause,
  writeContract: pause,
  error: errorPause,
  data: pauseHash
} = useWriteContract()
const { isLoading: isConfirmingPause, isSuccess: isConfirmedPause } = useWaitForTransactionReceipt({
  hash: pauseHash
})
watch(isConfirmingPause, (isConfirming, wasConfirming) => {
  if (wasConfirming && !isConfirming && isConfirmedPause.value) {
    addSuccessToast('Bank paused successfully')
    getIsPaused()
  }
})
const {
  writeContract: unpause,
  error: unpauseError,
  isPending: loadingUnpause,
  data: unpauseHash
} = useWriteContract()
const { isLoading: isConfirmingUnpause, isSuccess: isConfirmedUnpause } =
  useWaitForTransactionReceipt({
    hash: unpauseHash
  })
watch(isConfirmingUnpause, (isConfirming, wasConfirming) => {
  if (wasConfirming && !isConfirming && isConfirmedUnpause.value) {
    addSuccessToast('Bank unpaused successfully')
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
    emits('getOwner')
    transferOwnershipModal.value = false
    addSuccessToast('Bank ownership transferred successfully')
  }
})
const {
  execute: executeAddAction,
  error: errorAddAction,
  isLoading: addActionLoading,
  isSuccess: addActionSuccess
} = useAddAction()

const isOwner = computed(() => props.bankOwner === currentUserAddress)
const isOwnerBod = computed(() => props.bankOwner === props.team.boardOfDirectorsAddress)

const bankService = new BankService()

const addPauseAction = async () => {
  await executeAddAction(props.team, {
    description: description.value,
    data: (await bankService.getFunctionSignature(
      props.team.bankAddress!,
      isPaused.value ? 'unpause' : 'pause',
      []
    )) as Address,
    targetAddress: props.team.bankAddress! as Address
  })
}
const addTransferOwnershipAction = async (newOwner: string, description: string) => {
  await executeAddAction(props.team, {
    description,
    data: (await bankService.getFunctionSignature(props.team.bankAddress!, 'transferOwnership', [
      newOwner
    ])) as Address,
    targetAddress: props.team.bankAddress! as Address
  })
}

watch(errorPaused, () => {
  if (errorPaused.value) {
    addErrorToast('Failed to get bank status')
  }
})
watch(errorPause, () => {
  if (errorPause.value) {
    addErrorToast('Failed to pause bank')
  }
})

watch(unpauseError, () => {
  if (unpauseError.value) {
    addErrorToast('Failed to unpause bank')
  }
})

watch(transferOwnershipError, () => {
  if (transferOwnershipError.value) {
    addErrorToast('Failed to transfer ownership')
  }
})

watch(errorAddAction, () => {
  if (errorAddAction.value) {
    addErrorToast('Failed to add action')
  }
})
watch(addActionSuccess, () => {
  if (addActionSuccess.value) {
    addSuccessToast('Action added')
    descriptionModal.show = false
    transferOwnershipModal.value = false
  }
})

onMounted(async () => {
  await getIsPaused()
})
</script>
