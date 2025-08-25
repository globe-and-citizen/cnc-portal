<!-- Example: How to use the TransactionTimeline component -->
<template>
  <div>
    <button @click="startTransaction" class="btn btn-primary">Start Transaction</button>

    <TransactionTimeline
      :show="showTimeline"
      title="My Custom Transaction"
      :steps="timelineSteps"
      :transaction-hash="txHash"
      :block-number="blockNumber"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import TransactionTimeline from '@/components/ui/TransactionTimeline.vue'

const showTimeline = ref(false)
const txHash = ref<string>()
const blockNumber = ref<string>()
const currentStep = ref<'initiate' | 'pending' | 'confirming' | 'complete'>('initiate')

const timelineSteps = computed(() => ({
  initiate: {
    status: (currentStep.value === 'initiate'
      ? 'active'
      : ['pending', 'confirming', 'complete'].includes(currentStep.value)
        ? 'completed'
        : 'pending') as 'pending' | 'active' | 'completed' | 'error',
    title: 'Initialize', // Optional custom title
    description: 'Starting the transaction process...'
  },
  pending: {
    status: (currentStep.value === 'pending'
      ? 'active'
      : currentStep.value === 'complete' || currentStep.value === 'confirming'
        ? 'completed'
        : 'pending') as 'pending' | 'active' | 'completed' | 'error',
    description: 'Transaction sent to blockchain'
  },
  confirming: {
    status: (currentStep.value === 'confirming'
      ? 'active'
      : currentStep.value === 'complete'
        ? 'completed'
        : 'pending') as 'pending' | 'active' | 'completed' | 'error',
    description: 'Waiting for confirmation...'
  },
  complete: {
    status: (currentStep.value === 'complete' ? 'completed' : 'pending') as
      | 'pending'
      | 'active'
      | 'completed'
      | 'error',
    description: 'Transaction completed successfully!'
  }
}))

const startTransaction = async () => {
  showTimeline.value = true

  // Simulate transaction steps
  currentStep.value = 'initiate'
  await new Promise((resolve) => setTimeout(resolve, 1000))

  currentStep.value = 'pending'
  txHash.value = '0x1234567890abcdef1234567890abcdef12345678'
  await new Promise((resolve) => setTimeout(resolve, 2000))

  currentStep.value = 'confirming'
  await new Promise((resolve) => setTimeout(resolve, 3000))

  currentStep.value = 'complete'
  blockNumber.value = '12345678'

  // Hide timeline after 3 seconds
  setTimeout(() => {
    showTimeline.value = false
    currentStep.value = 'initiate'
    txHash.value = undefined
    blockNumber.value = undefined
  }, 3000)
}
</script>
