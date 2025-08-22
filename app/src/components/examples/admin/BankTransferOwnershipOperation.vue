<template>
  <div class="bank-transfer-ownership-operation mb-6">
    <h4 class="text-md font-semibold mb-3">Transfer Ownership</h4>
    
    <!-- Form -->
    <div class="mb-4">
      <div class="flex gap-3">
        <input
          v-model="newOwnerAddress"
          type="text"
          placeholder="New owner address (0x...)"
          class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          data-test="new-owner-address-input"
        />
        <button
          @click="handleTransferOwnership"
          :disabled="!isBankAddressValid || isLoading || !isValidAddress"
          class="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          data-test="transfer-ownership-btn"
        >
          Transfer Ownership
        </button>
      </div>
      <p v-if="newOwnerAddress && !isValidAddress" class="text-red-600 text-sm mt-1">
        Invalid Ethereum address
      </p>
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
            <td class="px-4 py-2 text-sm font-medium text-gray-900">New Owner Address</td>
            <td class="px-4 py-2 text-xs text-gray-700 font-mono">{{ newOwnerAddress || 'None' }}</td>
          </tr>
          <tr>
            <td class="px-4 py-2 text-sm font-medium text-gray-900">Address Valid</td>
            <td class="px-4 py-2 text-sm text-gray-700">{{ isValidAddress }}</td>
          </tr>
          <tr>
            <td class="px-4 py-2 text-sm font-medium text-gray-900">Is Loading</td>
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
          <tr style="display: none;">
            <td class="px-4 py-2 text-sm font-medium text-gray-900">Error</td>
            <td class="px-4 py-2 text-sm text-red-600">No errors (handled via toasts)</td>
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
const newOwnerAddress = ref('')

// Computed validation
const isValidAddress = computed(() => {
  return newOwnerAddress.value ? isAddress(newOwnerAddress.value) : true
})

// Get bank functionality (now includes all writes directly)
const {
  isBankAddressValid,
  isLoading,
  isWritePending,
  isConfirming,
  writeContractData,
  receipt,
  transferOwnership
} = useBankContract()

// Handle transfer ownership
const handleTransferOwnership = async () => {
  if (!isValidAddress.value || !newOwnerAddress.value) return
  await transferOwnership(newOwnerAddress.value as `0x${string}`)
  newOwnerAddress.value = ''
}
</script>
