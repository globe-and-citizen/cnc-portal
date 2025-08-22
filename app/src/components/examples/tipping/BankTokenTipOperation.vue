<template>
  <div class="bank-token-tip-operation mb-6">
    <h4 class="text-md font-semibold mb-3">Token Tip</h4>

    <!-- Form -->
    <div class="mb-4">
      <div class="grid grid-cols-3 gap-3 mb-3">
        <input
          v-model="tokenAddress"
          type="text"
          placeholder="Token address (0x...)"
          class="input input-bordered"
          data-test="token-tip-address-input"
        />
        <textarea
          v-model="recipientAddresses"
          placeholder="Recipients (comma-separated)"
          rows="2"
          class="textarea textarea-bordered"
          data-test="token-tip-recipients-input"
        />
        <input
          v-model="tipAmount"
          type="number"
          placeholder="Tip amount"
          step="0.01"
          class="input input-bordered"
          data-test="token-tip-amount-input"
        />
      </div>
      <button
        @click="handleSendTokenTip"
        :disabled="!isBankAddressValid || isLoading || !isFormValid"
        class="btn btn-accent w-full"
        data-test="send-token-tip-btn"
      >
        Send Token Tip
      </button>
      <div class="mt-2 space-y-1">
        <p v-if="tokenAddress && !isValidTokenAddress" class="text-error text-sm">
          Invalid token address
        </p>
        <p v-if="recipientAddresses && !areValidRecipients" class="text-error text-sm">
          One or more recipient addresses are invalid
        </p>
        <p v-if="tipAmount && !isValidAmount" class="text-error text-sm">
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
            <td class="font-medium">Recipients Count</td>
            <td>{{ recipientList.length }}</td>
          </tr>
          <tr>
            <td class="font-medium">Tip Amount</td>
            <td>{{ tipAmount || '0' }}</td>
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
import { isAddress } from 'viem'
import { useBankContract } from '@/composables/bank'

// Form data
const tokenAddress = ref('')
const recipientAddresses = ref('')
const tipAmount = ref('')

// Computed validations
const isValidTokenAddress = computed(() => {
  return tokenAddress.value ? isAddress(tokenAddress.value) : true
})

const recipientList = computed(() => {
  return recipientAddresses.value
    .split(',')
    .map((addr) => addr.trim())
    .filter((addr) => addr.length > 0)
})

const areValidRecipients = computed(() => {
  if (recipientList.value.length === 0) return true
  return recipientList.value.every((addr) => isAddress(addr))
})

const isValidAmount = computed(() => {
  const amount = parseFloat(tipAmount.value)
  return tipAmount.value ? amount > 0 : true
})

const isFormValid = computed(() => {
  return (
    tokenAddress.value &&
    recipientAddresses.value &&
    tipAmount.value &&
    isValidTokenAddress.value &&
    areValidRecipients.value &&
    isValidAmount.value &&
    recipientList.value.length > 0
  )
})

// Get bank functionality (now includes all writes directly)
const {
  isBankAddressValid,
  isLoading,
  isWritePending,
  isConfirming,
  writeContractData,
  receipt,
  sendTokenTip
} = useBankContract()

// Handle token tip
const handleSendTokenTip = async () => {
  if (!isFormValid.value) return
  await sendTokenTip(
    recipientList.value as `0x${string}`[],
    tokenAddress.value as `0x${string}`,
    tipAmount.value
  )
  tokenAddress.value = ''
  recipientAddresses.value = ''
  tipAmount.value = ''
}
</script>
