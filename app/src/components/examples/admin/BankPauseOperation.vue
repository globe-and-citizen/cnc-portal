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
        Pause Contract
      </button>
      <button
        @click="handleUnpauseContract"
        :disabled="!isBankAddressValid || isLoading || !Boolean(isPaused)"
        class="btn btn-success"
        data-test="unpause-contract-btn"
      >
        Unpause Contract
      </button>
    </div>

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
import { computed } from 'vue'
import { useBankContract } from '@/composables/bank'

// Get all bank functionality including reads and writes
const {
  // Read data
  isBankAddressValid,
  useBankPaused,

  // Write state (now directly from useBankWritesFunctions)
  isLoading,
  isWritePending,
  isConfirming,
  writeContractData,
  receipt,

  // Admin functions
  pauseContract,
  unpauseContract
} = useBankContract()

// Get current pause status
const { data: isPaused, isLoading: isReadLoading, error: readError } = useBankPaused()

// For now, we'll use readError as the main error since write errors are handled via toasts
const error = computed(() => readError.value)

// Handle pause contract
const handlePauseContract = async () => {
  await pauseContract()
}

// Handle unpause contract
const handleUnpauseContract = async () => {
  await unpauseContract()
}
</script>
