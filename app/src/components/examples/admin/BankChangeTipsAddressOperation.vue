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
          class="input input-bordered flex-1"
          data-test="new-tips-address-input"
        />
        <button
          @click="handleChangeTipsAddress"
          :disabled="!isBankAddressValid || isLoading || !isValidAddress"
          class="btn btn-primary"
          data-test="change-tips-address-btn"
        >
          Change Tips Address
        </button>
      </div>
      <p v-if="newTipsAddress && !isValidAddress" class="text-error text-sm mt-1">
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
const newTipsAddress = ref<Address | null>(null)

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
  if (newTipsAddress.value) {
    await changeTipsAddress(newTipsAddress.value)
    newTipsAddress.value = null
  }
}
</script>
