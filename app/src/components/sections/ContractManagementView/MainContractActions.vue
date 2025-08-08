<template>
  <div class="flex items-center gap-2">
    <ButtonUI
      :variant="row.paused ? 'info' : 'error'"
      size="sm"
      @click="changeContractStatus(row.paused)"
      :loading="isLoadingPauseContract || isLoadingUnpauseContract"
    >
      <IconifyIcon
        v-if="!isLoadingPauseContract && !isLoadingUnpauseContract"
        :icon="`heroicons:${row.paused ? 'play' : 'pause-circle'}-solid`"
      />
    </ButtonUI>
    <ButtonUI variant="success" :outline="true" size="sm" @click="showModal = true"
      >Transfer Ownership</ButtonUI
    >

    <teleport to="body">
      <ModalComponent v-model="showModal">
        <TransferOwnershipForm
          v-if="showModal"
          @transfer-ownership="transferOwnership"
          :loading="isLoadingTransferOwnership || isConfirmingTransferOwnership"
        />
      </ModalComponent>
    </teleport>
  </div>
</template>
<script setup lang="ts">
import { Icon as IconifyIcon } from '@iconify/vue'
import ButtonUI from '@/components/ButtonUI.vue'
import type { Abi, Address } from 'viem'
import type { TableRow } from '@/components/TableComponent.vue'
import { useWriteContract, useWaitForTransactionReceipt } from '@wagmi/vue'
import { watch, ref } from 'vue'
import { useToastStore } from '@/stores'
import TransferOwnershipForm from './forms/TransferOwnershipForm.vue'
import ModalComponent from '@/components/ModalComponent.vue'
import { parse } from 'path'
import { log, parseError } from '@/utils'

const props = defineProps<{
  row: TableRow
}>()

const emits = defineEmits(['contract-status-changed'])

const { addSuccessToast, addErrorToast } = useToastStore()

const showModal = ref(false)

const {
  data: hashTransferOwnership,
  writeContract: executeTransferOwnership,
  isPending: isLoadingTransferOwnership,
  error: errorTransferOwnership
} = useWriteContract()

const { isLoading: isConfirmingTransferOwnership, isSuccess: isConfirmedTransferOwnership } =
  useWaitForTransactionReceipt({
    hash: hashTransferOwnership
  })

const {
  data: hashPauseContract,
  writeContract: executePauseContract,
  isPending: isLoadingPauseContract
  // isError: errorCreateElection
} = useWriteContract()

const { isLoading: isConfirmingPauseContract, isSuccess: isConfirmedPauseContract } =
  useWaitForTransactionReceipt({
    hash: hashPauseContract
  })

const {
  data: hashUnpauseContract,
  writeContract: executeUnpauseContract,
  isPending: isLoadingUnpauseContract
  // isError: errorCreateElection
} = useWriteContract()

const { isLoading: isConfirmingUnpauseContract, isSuccess: isConfirmedUnpauseContract } =
  useWaitForTransactionReceipt({
    hash: hashUnpauseContract
  })

const transferOwnership = (address: Address) => {
  executeTransferOwnership({
    address: props.row.address as Address,
    abi: props.row.abi as Abi,
    functionName: 'transferOwnership',
    args: [address]
  })
}

const changeContractStatus = async (paused: boolean) => {
  if (paused) {
    executeUnpauseContract({
      address: props.row.address as Address,
      abi: props.row.abi as Abi,
      functionName: 'unpause'
    })
  } else {
    executePauseContract({
      address: props.row.address as Address,
      abi: props.row.abi as Abi,
      functionName: 'pause'
    })
  }
}

watch(isConfirmingTransferOwnership, async (isConfirming, wasConfirming) => {
  if (wasConfirming && !isConfirming && isConfirmedTransferOwnership.value) {
    addSuccessToast('Ownership transferred successfully!')
    emits('contract-status-changed')
  }
})

watch(isConfirmingPauseContract, async (isConfirming, wasConfirming) => {
  if (wasConfirming && !isConfirming && isConfirmedPauseContract.value) {
    addSuccessToast('Contract paused successfully!')
    emits('contract-status-changed')
  }
})

watch(isConfirmingUnpauseContract, async (isConfirming, wasConfirming) => {
  if (wasConfirming && !isConfirming && isConfirmedUnpauseContract.value) {
    addSuccessToast('Contract paused successfully!')
    emits('contract-status-changed')
  }
})

watch(errorTransferOwnership, (error) => {
  if (error) {
    addErrorToast(parseError(error, props.row.abi as Abi))
    log.error('errorTransferOwnership.value: ', error)
  }
})
</script>
