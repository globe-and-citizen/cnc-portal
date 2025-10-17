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
          class="input input-bordered flex-1"
          data-test="new-owner-address-input"
        />
        <button
          @click="handleTransferOwnership"
          :disabled="!isBankAddressValid || isLoading || !isValidAddress"
          class="btn btn-warning"
          data-test="transfer-ownership-btn"
        >
          Transfer Ownership
        </button>
      </div>
      <p v-if="newOwnerAddress && !isValidAddress" class="text-error text-sm mt-1">
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
            <td class="font-medium">New Owner Address</td>
            <td class="text-xs font-mono">{{ newOwnerAddress || 'None' }}</td>
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
          <tr style="display: none">
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
import { isAddress, type Address } from 'viem'
import { useBankContract } from '@/composables/bank'

// Form data
const newOwnerAddress = ref<Address | null>(null)

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
  if (newOwnerAddress.value) {
    await transferOwnership(newOwnerAddress.value)
    newOwnerAddress.value = null
  }
}
</script>
