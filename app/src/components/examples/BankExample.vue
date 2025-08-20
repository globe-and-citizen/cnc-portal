<template>
  <div class="bank-example p-6 space-y-6">
    <h2 class="text-2xl font-bold">Bank Contract Example</h2>
    
    <!-- Contract Info -->
    <div class="bg-gray-100 p-4 rounded-lg">
      <h3 class="text-lg font-semibold mb-2">Contract Information</h3>
      <p><strong>Bank Address:</strong> {{ bankAddress || 'Not found' }}</p>
      <p><strong>Is Paused:</strong> {{ pausedData || 'Loading...' }}</p>
      <p><strong>Owner:</strong> {{ ownerData || 'Loading...' }}</p>
      <p><strong>Tips Address:</strong> {{ tipsAddressData || 'Loading...' }}</p>
    </div>

    <!-- Loading States -->
    <div class="bg-blue-100 p-4 rounded-lg">
      <h3 class="text-lg font-semibold mb-2">Loading States</h3>
      <p><strong>Write Pending:</strong> {{ isWritePending }}</p>
      <p><strong>Confirming:</strong> {{ isConfirming }}</p>
      <p><strong>Overall Loading:</strong> {{ isLoading }}</p>
    </div>

    <!-- Admin Functions -->
    <div class="bg-yellow-100 p-4 rounded-lg">
      <h3 class="text-lg font-semibold mb-2">Admin Functions</h3>
      <div class="space-x-2">
        <button 
          data-test="pause-btn"
          @click="pauseContract"
          :disabled="isLoading"
          class="px-4 py-2 bg-red-500 text-white rounded disabled:opacity-50"
        >
          Pause Contract
        </button>
        
        <button 
          data-test="unpause-btn"
          @click="unpauseContract"
          :disabled="isLoading"
          class="px-4 py-2 bg-green-500 text-white rounded disabled:opacity-50"
        >
          Unpause Contract
        </button>
      </div>
    </div>

    <!-- Transfer Functions -->
    <div class="bg-green-100 p-4 rounded-lg">
      <h3 class="text-lg font-semibold mb-2">Transfer Functions</h3>
      
      <!-- ETH Transfer -->
      <div class="mb-4">
        <h4 class="font-semibold">Transfer ETH</h4>
        <div class="flex space-x-2 mt-2">
          <input
            data-test="eth-recipient-input"
            v-model="ethRecipient"
            placeholder="Recipient address"
            class="flex-1 p-2 border rounded"
          />
          <input
            data-test="eth-amount-input"
            v-model="ethAmount"
            placeholder="Amount in ETH"
            type="number"
            step="0.01"
            class="w-32 p-2 border rounded"
          />
          <button
            data-test="transfer-eth-btn"
            @click="handleTransferEth"
            :disabled="isLoading || !ethRecipient || !ethAmount"
            class="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
          >
            Transfer ETH
          </button>
        </div>
      </div>

      <!-- Token Transfer -->
      <div class="mb-4">
        <h4 class="font-semibold">Transfer Token</h4>
        <div class="flex space-x-2 mt-2">
          <input
            data-test="token-address-input"
            v-model="tokenAddress"
            placeholder="Token contract address"
            class="flex-1 p-2 border rounded"
          />
          <input
            data-test="token-recipient-input"
            v-model="tokenRecipient"
            placeholder="Recipient address"
            class="flex-1 p-2 border rounded"
          />
          <input
            data-test="token-amount-input"
            v-model="tokenAmount"
            placeholder="Amount"
            type="number"
            step="0.01"
            class="w-32 p-2 border rounded"
          />
          <button
            data-test="transfer-token-btn"
            @click="handleTransferToken"
            :disabled="isLoading || !tokenAddress || !tokenRecipient || !tokenAmount"
            class="px-4 py-2 bg-purple-500 text-white rounded disabled:opacity-50"
          >
            Transfer Token
          </button>
        </div>
      </div>
    </div>

    <!-- Tipping Functions -->
    <div class="bg-orange-100 p-4 rounded-lg">
      <h3 class="text-lg font-semibold mb-2">Tipping Functions</h3>
      
      <!-- ETH Tip -->
      <div class="mb-4">
        <h4 class="font-semibold">Send ETH Tip</h4>
        <div class="space-y-2 mt-2">
          <textarea
            data-test="tip-recipients-input"
            v-model="tipRecipients"
            placeholder="Enter recipient addresses (one per line)"
            rows="3"
            class="w-full p-2 border rounded"
          ></textarea>
          <div class="flex space-x-2">
            <input
              data-test="tip-amount-input"
              v-model="tipAmount"
              placeholder="Total tip amount in ETH"
              type="number"
              step="0.01"
              class="w-48 p-2 border rounded"
            />
            <button
              data-test="send-eth-tip-btn"
              @click="handleSendEthTip"
              :disabled="isLoading || !tipRecipients || !tipAmount"
              class="px-4 py-2 bg-indigo-500 text-white rounded disabled:opacity-50"
            >
              Send ETH Tip
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Token Support -->
    <div class="bg-pink-100 p-4 rounded-lg">
      <h3 class="text-lg font-semibold mb-2">Token Support Check</h3>
      <div class="flex space-x-2">
        <input
          data-test="check-token-input"
          v-model="checkTokenAddress"
          placeholder="Token address to check"
          class="flex-1 p-2 border rounded"
        />
        <button
          data-test="check-support-btn"
          @click="checkTokenSupport"
          :disabled="!checkTokenAddress"
          class="px-4 py-2 bg-gray-500 text-white rounded disabled:opacity-50"
        >
          Check Support
        </button>
      </div>
      <p v-if="tokenSupportResult !== null" class="mt-2">
        <strong>Support Status:</strong> {{ tokenSupportResult ? 'Supported' : 'Not Supported' }}
      </p>
    </div>

    <!-- Transaction Receipt -->
    <div v-if="receipt" class="bg-gray-200 p-4 rounded-lg">
      <h3 class="text-lg font-semibold mb-2">Last Transaction</h3>
      <p><strong>Hash:</strong> {{ writeContractData }}</p>
      <p><strong>Block Number:</strong> {{ receipt.blockNumber }}</p>
      <p><strong>Status:</strong> {{ receipt.status === 'success' ? 'Success' : 'Failed' }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { isAddress, type Address } from 'viem'
import { useBankContract } from '@/composables/bank'

// Get all bank contract functionality
const {
  bankAddress,
  isLoading,
  isWritePending,
  isConfirming,
  isConfirmed,
  writeContractData,
  receipt,
  useBankPaused,
  useBankOwner,
  useBankTipsAddress,
  useBankIsTokenSupported,
  pauseContract,
  unpauseContract,
  transferEth,
  transferToken,
  sendEthTip
} = useBankContract()

// Read contract data
const { data: pausedData } = useBankPaused()
const { data: ownerData } = useBankOwner()
const { data: tipsAddressData } = useBankTipsAddress()

// Form data
const ethRecipient = ref('')
const ethAmount = ref('')
const tokenAddress = ref('')
const tokenRecipient = ref('')
const tokenAmount = ref('')
const tipRecipients = ref('')
const tipAmount = ref('')
const checkTokenAddress = ref('')
const tokenSupportResult = ref<boolean | null>(null)

// Handle ETH transfer
const handleTransferEth = async () => {
  if (!isAddress(ethRecipient.value)) {
    alert('Invalid recipient address')
    return
  }
  await transferEth(ethRecipient.value as Address, ethAmount.value)
}

// Handle token transfer
const handleTransferToken = async () => {
  if (!isAddress(tokenAddress.value)) {
    alert('Invalid token address')
    return
  }
  if (!isAddress(tokenRecipient.value)) {
    alert('Invalid recipient address')
    return
  }
  await transferToken(
    tokenAddress.value as Address,
    tokenRecipient.value as Address,
    tokenAmount.value
  )
}

// Handle ETH tip
const handleSendEthTip = async () => {
  const addresses = tipRecipients.value
    .split('\n')
    .map(addr => addr.trim())
    .filter(addr => addr.length > 0)
  
  if (!addresses.every(addr => isAddress(addr))) {
    alert('One or more invalid addresses')
    return
  }
  
  await sendEthTip(addresses as Address[], tipAmount.value)
}

// Check token support
const checkTokenSupport = async () => {
  if (!isAddress(checkTokenAddress.value)) {
    alert('Invalid token address')
    return
  }
  
  const { data } = useBankIsTokenSupported(checkTokenAddress.value as Address)
  // In a real implementation, you'd watch this data
  // For this example, we'll just set a placeholder
  tokenSupportResult.value = Boolean(data.value)
}
</script>

<style scoped>
.bank-example {
  max-width: 800px;
  margin: 0 auto;
}
</style>
