<template>
  <div class="bank-eth-tip-operation mb-6">
    <h4 class="text-md font-semibold mb-3">ETH Tip</h4>
    
    <!-- Form -->
    <div class="mb-4">
      <div class="grid grid-cols-2 gap-3 mb-3">
        <textarea
          v-model="recipientAddresses"
          placeholder="Recipient addresses (comma-separated)"
          rows="3"
          class="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          data-test="eth-tip-recipients-input"
        />
        <input
          v-model="tipAmount"
          type="number"
          placeholder="Tip amount in ETH"
          step="0.01"
          class="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          data-test="eth-tip-amount-input"
        />
      </div>
      <button
        @click="handleSendEthTip"
        :disabled="!isBankAddressValid || isLoading || !isFormValid"
        class="w-full px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        data-test="send-eth-tip-btn"
      >
        Send ETH Tip
      </button>
      <div class="mt-2 space-y-1">
        <p v-if="recipientAddresses && !areValidRecipients" class="text-red-600 text-sm">
          One or more recipient addresses are invalid
        </p>
        <p v-if="tipAmount && !isValidAmount" class="text-red-600 text-sm">
          Amount must be greater than 0
        </p>
      </div>
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
            <td class="px-4 py-2 text-sm font-medium text-gray-900">Recipients Count</td>
            <td class="px-4 py-2 text-sm text-gray-700">{{ recipientList.length }}</td>
          </tr>
          <tr>
            <td class="px-4 py-2 text-sm font-medium text-gray-900">Tip Amount (ETH)</td>
            <td class="px-4 py-2 text-sm text-gray-700">{{ tipAmount || '0' }}</td>
          </tr>
          <tr>
            <td class="px-4 py-2 text-sm font-medium text-gray-900">Form Valid</td>
            <td class="px-4 py-2 text-sm text-gray-700">{{ isFormValid }}</td>
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
const recipientAddresses = ref('')
const tipAmount = ref('')

// Computed validations
const recipientList = computed(() => {
  return recipientAddresses.value
    .split(',')
    .map(addr => addr.trim())
    .filter(addr => addr.length > 0)
})

const areValidRecipients = computed(() => {
  if (recipientList.value.length === 0) return true
  return recipientList.value.every(addr => isAddress(addr))
})

const isValidAmount = computed(() => {
  const amount = parseFloat(tipAmount.value)
  return tipAmount.value ? amount > 0 : true
})

const isFormValid = computed(() => {
  return recipientAddresses.value && 
         tipAmount.value && 
         areValidRecipients.value && 
         isValidAmount.value &&
         recipientList.value.length > 0
})

// Get bank functionality (now includes all writes directly)
const {
  isBankAddressValid,
  isLoading,
  isWritePending,
  isConfirming,
  writeContractData,
  receipt,
  sendEthTip
} = useBankContract()

// Handle ETH tip
const handleSendEthTip = async () => {
  if (!isFormValid.value) return
  await sendEthTip(recipientList.value as `0x${string}`[], tipAmount.value)
  recipientAddresses.value = ''
  tipAmount.value = ''
}
</script>
