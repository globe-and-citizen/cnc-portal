<template>
  <div class="flex items-center justify-center p-4">
    <div class="w-full" style="max-width: 900px">
      <!-- Increased width to 900px -->
      <div class="text-center mb-10">
        <h1 class="text-3xl font-bold mb-2">Account Setup</h1>
        <p class="text-gray-500">
          Configure your trading wallet to start placing bets on Polymarket
        </p>
      </div>

      <StepIndicator :steps="steps" :current-step="currentStep" />

      <StepLabels :steps="steps" :current-step="currentStep" />

      <!-- Step Content -->
      <div class="card bg-base-100 shadow-xl p-8 max-w-2xl mx-auto">
        <PolymarketSafeDeployment
          v-if="currentStep === 1"
          :is-processing="isProcessing"
          @deploy-safe="handleStepAction"
        />

        <ApprovalAndConfig
          v-else-if="currentStep === 2"
          :is-processing="isProcessing"
          @approve-and-configure="handleStepAction"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import PolymarketSafeDeployment from './PolymarketSafeDeployment.vue'
import ApprovalAndConfig from './ApprovalAndConfig.vue'
import StepIndicator from './StepIndicators.vue'
import StepLabels from './StepLabels.vue'

const currentStep = ref(1)
const isProcessing = ref(false)

const steps = [
  {
    id: 1,
    title: 'Deploy Polymarket Safe',
    description: 'Create your multi-sig trading wallet on the blockchain'
  },
  {
    id: 2,
    title: 'Approve & Configure',
    description: 'Approve tokens and add owners in one transaction'
  }
]

const handleStepAction = async () => {
  isProcessing.value = true
  // Simulate blockchain transaction
  await new Promise((resolve) => setTimeout(resolve, 2000))
  isProcessing.value = false

  if (currentStep.value < steps.length) {
    currentStep.value = currentStep.value + 1
  } else {
    // props.onComplete()
  }
}
</script>
