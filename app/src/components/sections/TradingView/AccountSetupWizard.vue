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

      <!-- Step Indicators -->
      <div class="flex items-center justify-center mb-10">
        <div v-for="(step, index) in steps" :key="step.id" class="flex items-center">
          <div
            :class="[
              'step-indicator',
              currentStep > step.id && 'completed',
              currentStep === step.id && 'active',
              currentStep < step.id && 'pending'
            ]"
          >
            <IconifyIcon
              v-if="currentStep > step.id"
              icon="heroicons:check-20-solid"
              class="w-5 h-5"
            />
            <span v-else>{{ step.id }}</span>
          </div>
          <div
            v-if="index < steps.length - 1"
            :class="[
              'w-20 h-0.5 mx-2 transition-colors duration-300',
              currentStep > step.id ? 'bg-green-500' : 'bg-gray-300'
            ]"
          />
        </div>
      </div>

      <!-- Step Labels -->
      <div class="flex justify-center mb-10">
        <div class="grid grid-cols-2 gap-8" style="width: 500px">
          <div
            v-for="step in steps"
            :key="step.id"
            :class="[
              'text-center transition-opacity duration-300',
              currentStep >= step.id ? 'opacity-100' : 'opacity-50'
            ]"
          >
            <p class="font-medium text-sm">{{ step.title }}</p>
            <p class="text-xs text-gray-500 mt-1">{{ step.description }}</p>
          </div>
        </div>
      </div>

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
import { Icon as IconifyIcon } from '@iconify/vue'
import PolymarketSafeDeployment from './PolymarketSafeDeployment.vue'
import ApprovalAndConfig from './ApprovalAndConfig.vue'

// const props = defineProps({
//   onComplete: {
//     type: Function,
//     required: true
//   }
// })

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

<style scoped>
.step-indicator {
  @apply w-10 h-10 rounded-full border-2 flex items-center justify-center text-sm font-medium transition-all duration-300;
}

.step-indicator.completed {
  @apply border-green-500 bg-green-500 text-white;
}

.step-indicator.active {
  @apply border-primary bg-primary text-white;
}

.step-indicator.pending {
  @apply border-gray-300 bg-white text-gray-500;
}

.animate-fade-in {
  animation: fadeIn 0.3s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
