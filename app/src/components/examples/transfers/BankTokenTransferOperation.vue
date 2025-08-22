<template>
  <div class="bank-token-transfer-operation mb-6">
    <h4 class="text-md font-semibold mb-3">Token Transfer</h4>
    
    <!-- Form -->
    <div class="mb-4">
      <div class="grid grid-cols-3 gap-3 mb-3">
        <input
          v-model="tokenAddress"
          type="text"
          placeholder="Token address (0x...)"
          class="input input-bordered"
          data-test="token-address-input"
        />
        <input
          v-model="recipientAddress"
          type="text"
          placeholder="Recipient address (0x...)"
          class="input input-bordered"
          data-test="token-recipient-input"
        />
        <input
          v-model="tokenAmount"
          type="number"
          placeholder="Amount"
          step="0.01"
          class="input input-bordered"
          data-test="token-amount-input"
        />
      </div>
      <button
        @click="handleTransferToken"
        :disabled="!isBankAddressValid || isLoading || !isFormValid"
        class="btn btn-success w-full"
        data-test="transfer-token-btn"
      >
        Transfer Token
      </button>
      <div class="mt-2 space-y-1">
        <p v-if="tokenAddress && !isValidTokenAddress" class="text-error text-sm">
          Invalid token address
        </p>
        <p v-if="recipientAddress && !isValidRecipient" class="text-error text-sm">
          Invalid recipient address
        </p>
        <p v-if="tokenAmount && !isValidAmount" class="text-error text-sm">
          Amount must be greater than 0
        </p>
      </div>
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
            <td class="font-medium">Token Address</td>
            <td class="text-xs font-mono">{{ tokenAddress || 'None' }}</td>
          </tr>
          <tr>
            <td class="font-medium">Recipient</td>
            <td class="text-xs font-mono">{{ recipientAddress || 'None' }}</td>
          </tr>
          <tr>
            <td class="font-medium">Amount</td>
            <td>{{ tokenAmount || '0' }}</td>
          </tr>
          <tr>
            <td class="font-medium">Form Valid</td>
            <td>{{ isFormValid }}</td>
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
const tokenAddress = ref('')
const recipientAddress = ref('')
const tokenAmount = ref('')

// Computed validations
const isValidTokenAddress = computed(() => {
  return tokenAddress.value ? isAddress(tokenAddress.value) : true
})

const isValidRecipient = computed(() => {
  return recipientAddress.value ? isAddress(recipientAddress.value) : true
})

const isValidAmount = computed(() => {
  const amount = parseFloat(tokenAmount.value)
  return tokenAmount.value ? amount > 0 : true
})

const isFormValid = computed(() => {
  return tokenAddress.value && 
         recipientAddress.value && 
         tokenAmount.value && 
         isValidTokenAddress.value && 
         isValidRecipient.value && 
         isValidAmount.value
})

// Get bank functionality (now includes all writes directly)
const {
  isBankAddressValid,
  isLoading,
  isWritePending,
  isConfirming,
  writeContractData,
  receipt,
  transferToken
} = useBankContract()

// Handle token transfer
const handleTransferToken = async () => {
  if (!isFormValid.value) return
  await transferToken(tokenAddress.value as `0x${string}`, recipientAddress.value as `0x${string}`, tokenAmount.value)
  tokenAddress.value = ''
  recipientAddress.value = ''
  tokenAmount.value = ''
}
</script>
