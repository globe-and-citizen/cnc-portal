<template>
  <div class="bank-pause-operation mb-6">
    <h4 class="text-md font-semibold mb-3">Pause/Unpause Contract</h4>

    <!-- Current Status -->
    <div class="mb-4 p-3 bg-gray-50 rounded-md">
      <h5 class="text-sm font-medium mb-2">Current Contract Status</h5>
      <div class="flex items-center gap-2">
        <span class="text-sm font-medium">Contract is:</span>
        <span v-if="isReadLoading" class="text-sm text-gray-500" data-test="pause-status-loading">
          Loading...
        </span>
        <span v-else-if="readError" class="text-sm text-red-600" data-test="pause-status-error">
          Error loading status
        </span>
        <span
          v-else
          :class="isPaused ? 'text-red-600 font-semibold' : 'text-green-600 font-semibold'"
          data-test="pause-status"
        >
          {{ isPaused ? 'PAUSED' : 'ACTIVE' }}
        </span>
      </div>
    </div>

    <!-- Action Buttons -->
    <div class="flex gap-3 mb-4">
      <button
        @click="handlePauseContract"
        :disabled="!isBankAddressValid || isLoading || Boolean(isPaused)"
        class="btn btn-error"
        data-test="pause-contract-btn"
      >
        <span
          v-if="isLoading && currentOperation === 'pause'"
          class="loading loading-spinner loading-sm"
        ></span>
        Pause Contract
      </button>
      <button
        @click="handleUnpauseContract"
        :disabled="!isBankAddressValid || isLoading || !Boolean(isPaused)"
        class="btn btn-success"
        data-test="unpause-contract-btn"
      >
        <span
          v-if="isLoading && currentOperation === 'unpause'"
          class="loading loading-spinner loading-sm"
        ></span>
        Unpause Contract
      </button>
    </div>

    <!-- Transaction Timeline -->
    <TransactionTimeline
      :show="true"
      title="Transaction Progress"
      :steps="timelineSteps"
      :transaction-hash="writeContractData"
      :block-number="receipt?.blockNumber?.toString()"
    />

    <!-- State Table -->
    <div class="overflow-x-auto">
      <table class="table table-zebra w-full">
        <thead>
          <tr>
            <th>Property</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="font-medium">Read Loading</td>
            <td>{{ isReadLoading }}</td>
          </tr>
          <tr>
            <td class="font-medium">Current Pause Status</td>
            <td>
              <span
                :class="
                  Boolean(isPaused) ? 'text-error font-semibold' : 'text-success font-semibold'
                "
              >
                {{ Boolean(isPaused) ? 'PAUSED' : 'ACTIVE' }}
              </span>
            </td>
          </tr>
          <tr>
            <td class="font-medium">Is Write Loading</td>
            <td>{{ isLoading }}</td>
          </tr>
          <tr>
            <td class="font-medium">Is Write Pending</td>
            <td>{{ isWritePending }}</td>
          </tr>
          <tr>
            <td class="font-medium">Is Confirming</td>
            <td>{{ isConfirming }}</td>
          </tr>
          <tr>
            <td class="font-medium">Write Data</td>
            <td class="text-xs font-mono">
              {{ writeContractData ? JSON.stringify(writeContractData, null, 2) : 'None' }}
            </td>
          </tr>
          <tr>
            <td class="font-medium">Receipt</td>
            <td class="text-xs font-mono">
              {{ receipt ? `Block: ${receipt.blockNumber}` : 'None' }}
            </td>
          </tr>
          <tr v-if="error">
            <td class="font-medium">Error</td>
            <td class="text-error">{{ error.message }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useBankContract } from '@/composables/bank/index'
import TransactionTimeline from '@/components/ui/TransactionTimeline.vue'

const {
  isBankAddressValid,
  useBankPaused,
  isLoading,
  isWritePending,
  isConfirming,
  isConfirmed,
  writeContractData,
  receipt,
  error: writeError,
  pauseContract,
  unpauseContract
} = useBankContract()

const { data: isPaused, isLoading: isReadLoading, error: readError } = useBankPaused()

const currentOperation = ref<'pause' | 'unpause' | null>(null)

const timelineSteps = computed(() => {
  const operation = currentOperation.value
  const operationText = operation === 'pause' ? 'pause' : 'unpause'
  const operationPastText = operation === 'pause' ? 'paused' : 'unpaused'

  return {
    initiate: {
      status: (currentOperation.value ? 'completed' : 'pending') as
        | 'pending'
        | 'active'
        | 'completed'
        | 'error',
      description: `Initiating ${operationText} transaction...`
    },
    pending: {
      status: (isWritePending.value
        ? 'active'
        : writeContractData.value
          ? 'completed'
          : writeError.value
            ? 'error'
            : 'pending') as 'pending' | 'active' | 'completed' | 'error',
      description: writeError.value
        ? `Transaction failed: ${writeError.value.message}`
        : writeContractData.value
          ? 'Transaction sent to blockchain'
          : 'Waiting for transaction to be sent...'
    },
    confirming: {
      status: (isConfirming.value
        ? 'active'
        : isConfirmed.value
          ? 'completed'
          : writeError.value
            ? 'error'
            : writeContractData.value
              ? 'pending'
              : 'pending') as 'pending' | 'active' | 'completed' | 'error',
      description: isConfirmed.value
        ? 'Transaction confirmed on blockchain'
        : isConfirming.value
          ? 'Waiting for blockchain confirmation...'
          : writeError.value
            ? 'Transaction confirmation failed'
            : 'Waiting for confirmation to start...'
    },
    complete: {
      status: (isConfirmed.value && receipt.value
        ? 'completed'
        : writeError.value
          ? 'error'
          : 'pending') as 'pending' | 'active' | 'completed' | 'error',
      description:
        isConfirmed.value && receipt.value
          ? `Contract successfully ${operationPastText}!`
          : writeError.value
            ? `Failed to ${operationText} contract`
            : `Waiting for ${operationText} operation to complete...`
    }
  }
})

watch([isConfirmed, writeError], ([confirmed, error]) => {
  if (confirmed && receipt.value) {
    setTimeout(() => {
      currentOperation.value = null
    }, 3000)
  } else if (error) {
    setTimeout(() => {
      currentOperation.value = null
    }, 5000)
  }
})

const error = computed(() => readError.value)

const handlePauseContract = async () => {
  currentOperation.value = 'pause'
  await pauseContract()
}

const handleUnpauseContract = async () => {
  currentOperation.value = 'unpause'
  await unpauseContract()
}
</script>
