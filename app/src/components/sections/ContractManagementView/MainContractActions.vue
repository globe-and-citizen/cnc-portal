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
    <ButtonUI
      variant="success"
      :outline="true"
      size="sm"
      @click="() => console.log('Transferring ownership...')"
      >Transfer Ownership</ButtonUI
    >
  </div>
</template>
<script setup lang="ts">
import { Icon as IconifyIcon } from '@iconify/vue'
import ButtonUI from '@/components/ButtonUI.vue'
import type { Abi, Address } from 'viem'
import type { TableRow } from '@/components/TableComponent.vue'
import { useWriteContract, useWaitForTransactionReceipt } from '@wagmi/vue'
import { watch } from 'vue'
import { useToastStore } from '@/stores'

const props = defineProps<{
  row: TableRow
}>()

const emits = defineEmits(['contract-status-changed'])

const { addSuccessToast } = useToastStore()

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
</script>
