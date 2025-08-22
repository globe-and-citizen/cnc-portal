<template>
  <div class="bank-change-tips-address-operation mb-6">
    <h4 class="text-md font-semibold mb-3">Change Tips Address</h4>
    
    <!-- Form -->
    <div class="mb-4">
      <div class="flex gap-3">
        <input
          v-model="newTipsAddress"
          type="text"
          placeholder="New tips address (0x...)"
          class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          data-test="new-tips-address-input"
        />
        <button
          @click="handleChangeTipsAddress"
          :disabled="!isBankAddressValid || isLoading || !isValidAddress"
          class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          data-test="change-tips-address-btn"
        >
          Change Tips Address
        </button>
      </div>
      <p v-if="newTipsAddress && !isValidAddress" class="text-red-600 text-sm mt-1">
        Invalid Ethereum address
      </p>
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
            <td class="font-medium">New Tips Address</td>
            <td class="text-xs font-mono">{{ newTipsAddress || 'None' }}</td>
          </tr>
          <tr>
            <td class="font-medium">Address Valid</td>
            <td>{{ isValidAddress }}</td>
          </tr>
          <tr>
            <td class="font-medium">Is Loading</td>
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
          <tr style="display: none;">
            <td class="font-medium">Error</td>
            <td class="text-error">No errors (handled via toasts)</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { isAddress } from 'viem'
import { useBankContract } from '@/composables/bank'

// Form data
const newTipsAddress = ref('')

// Computed validation
const isValidAddress = computed(() => {
  return newTipsAddress.value ? isAddress(newTipsAddress.value) : true
})

// Get bank functionality (now includes all writes directly)
const {
  isBankAddressValid,
  isLoading,
  isWritePending,
  isConfirming,
  writeContractData,
  receipt,
  changeTipsAddress
} = useBankContract()

// Handle change tips address
const handleChangeTipsAddress = async () => {
  if (!isValidAddress.value || !newTipsAddress.value) return
  await changeTipsAddress(newTipsAddress.value as `0x${string}`)
  newTipsAddress.value = ''
}
</script>
