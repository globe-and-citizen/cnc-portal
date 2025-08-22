<template>
  <div class="bank-pause-operation mb-6">
    <h4 class="text-md font-semibold mb-3">Pause/Unpause Contract</h4>
    
    <!-- Current Status -->
    <div class="mb-4 p-3 bg-gray-50 rounded-md">
      <h5 class="text-sm font-medium mb-2">Current Contract Status</h5>
      <div class="flex items-center gap-2">
        <span class="text-sm font-medium">Contract is:</span>
        <span 
          v-if="isReadLoading" 
          class="text-sm text-gray-500"
          data-test="pause-status-loading"
        >
          Loading...
        </span>
        <span 
          v-else-if="readError" 
          class="text-sm text-red-600"
          data-test="pause-status-error"
        >
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
        class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        data-test="pause-contract-btn"
      >
        Pause Contract
      </button>
      <button
        @click="handleUnpauseContract"
        :disabled="!isBankAddressValid || isLoading || !Boolean(isPaused)"
        class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        data-test="unpause-contract-btn"
      >
        Unpause Contract
      </button>
    </div>

    <!-- State Table -->
    <div class="overflow-x-auto">
      <table class="min-w-full table-auto border border-gray-200">
        <thead>
          <tr class="bg-gray-50">
            <th class="px-4 py-2 text-left text-sm font-medium text-gray-700">Property</th>
            <th class="px-4 py-2 text-left text-sm font-medium text-gray-700">Value</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200">
          <tr>
            <td class="px-4 py-2 text-sm font-medium text-gray-900">Read Loading</td>
            <td class="px-4 py-2 text-sm text-gray-700">{{ isReadLoading }}</td>
          </tr>
          <tr>
            <td class="px-4 py-2 text-sm font-medium text-gray-900">Current Pause Status</td>
            <td class="px-4 py-2 text-sm text-gray-700">
              <span :class="Boolean(isPaused) ? 'text-red-600 font-semibold' : 'text-green-600 font-semibold'">
                {{ Boolean(isPaused) ? 'PAUSED' : 'ACTIVE' }}
              </span>
            </td>
          </tr>
          <tr>
            <td class="px-4 py-2 text-sm font-medium text-gray-900">Is Write Loading</td>
            <td class="px-4 py-2 text-sm text-gray-700">{{ isLoading }}</td>
          </tr>
          <tr>
            <td class="px-4 py-2 text-sm font-medium text-gray-900">Is Write Pending</td>
            <td class="px-4 py-2 text-sm text-gray-700">{{ isWritePending }}</td>
          </tr>
          <tr>
            <td class="px-4 py-2 text-sm font-medium text-gray-900">Is Confirming</td>
            <td class="px-4 py-2 text-sm text-gray-700">{{ isConfirming }}</td>
          </tr>
          <tr>
            <td class="px-4 py-2 text-sm font-medium text-gray-900">Write Data</td>
            <td class="px-4 py-2 text-xs text-gray-700 font-mono">
              {{ writeContractData ? JSON.stringify(writeContractData, null, 2) : 'None' }}
            </td>
          </tr>
          <tr>
            <td class="px-4 py-2 text-sm font-medium text-gray-900">Receipt</td>
            <td class="px-4 py-2 text-xs text-gray-700 font-mono">
              {{ receipt ? `Block: ${receipt.blockNumber}` : 'None' }}
            </td>
          </tr>
          <tr v-if="error">
            <td class="px-4 py-2 text-sm font-medium text-gray-900">Error</td>
            <td class="px-4 py-2 text-sm text-red-600">{{ error.message }}</td>
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
const { 
  data: isPaused, 
  isLoading: isReadLoading, 
  error: readError 
} = useBankPaused()

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
