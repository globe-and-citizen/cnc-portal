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
        <div v-if="currentStep === 1" class="space-y-6 animate-fade-in">
          <div class="bg-base-200 p-6 rounded-xl space-y-4">
            <div class="flex items-center gap-3">
              <IconifyIcon icon="heroicons:shield-check" class="w-8 h-8 text-primary" />
              <div>
                <h3 class="font-semibold">Polymarket Safe Deployment</h3>
                <p class="text-sm text-gray-500">Gnosis Safe wallet for trading</p>
              </div>
            </div>
            <div class="grid grid-cols-2 gap-4 text-sm">
              <div class="bg-base-300 p-3 rounded-lg">
                <span class="text-gray-500">Network</span>
                <p class="font-mono">Polygon</p>
              </div>
              <div class="bg-base-300 p-3 rounded-lg">
                <span class="text-gray-500">Safe Address</span>
                <p class="font-mono">0x7a3B...9f2E</p>
              </div>
            </div>
          </div>
          <ButtonUI
            @click="handleStepAction"
            :disabled="isProcessing"
            variant="primary"
            size="lg"
            :wide="true"
            class="w-full text-white"
          >
            <IconifyIcon
              v-if="isProcessing"
              icon="heroicons:arrow-path"
              class="w-4 h-4 animate-spin"
            />
            {{ isProcessing ? 'Deploying...' : 'Deploy Polymarket Safe' }}
          </ButtonUI>
        </div>

        <div v-else-if="currentStep === 2" class="space-y-6 animate-fade-in">
          <div class="collapse collapse-plus bg-base-200 rounded-xl mb-4">
            <input type="checkbox" />
            <div class="collapse-title text-xl font-medium px-6 py-4">
              <div class="flex items-center gap-3">
                <IconifyIcon icon="heroicons:currency-dollar" class="w-6 h-6 text-primary" />
                <div class="text-left">
                  <p class="text-lg font-semibold">USDC.e Approvals</p>
                  <p class="text-sm text-gray-500">Approve USDC for Polymarket trading</p>
                </div>
              </div>
            </div>
            <div class="collapse-content px-6 pb-4">
              <div class="space-y-2">
                <div
                  v-for="(approval, index) in usdcApprovals"
                  :key="index"
                  class="flex items-center justify-between bg-base-300 p-3 rounded-lg"
                >
                  <div class="flex items-center gap-3">
                    <div
                      class="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center"
                    >
                      <span class="font-mono text-xs text-blue-400">USDC</span>
                    </div>
                    <div>
                      <p class="text-sm font-medium">{{ approval.contract }}</p>
                      <p class="font-mono text-xs text-gray-500">
                        {{ approval.address.slice(0, 6) }}...{{ approval.address.slice(-4) }}
                      </p>
                    </div>
                  </div>
                  <span class="text-primary font-mono text-sm">Unlimited</span>
                </div>
              </div>
            </div>
          </div>

          <div class="collapse collapse-plus bg-base-200 rounded-xl mb-4">
            <input type="checkbox" />
            <div class="collapse-title text-xl font-medium px-6 py-4">
              <div class="flex items-center gap-3">
                <IconifyIcon icon="heroicons:currency-dollar" class="w-6 h-6 text-accent" />
                <div class="text-left">
                  <p class="text-lg font-semibold">Outcome Token Approvals</p>
                  <p class="text-sm text-gray-500">Approve Outcome Token for Polymarket trading</p>
                </div>
              </div>
            </div>
            <div class="collapse-content px-6 pb-4">
              <div class="space-y-2">
                <div
                  v-for="(approval, index) in outcomeTokenApprovals"
                  :key="index"
                  class="flex items-center justify-between bg-base-300 p-3 rounded-lg"
                >
                  <div class="flex items-center gap-3">
                    <div
                      class="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center"
                    >
                      <span class="font-mono text-xs text-purple-400">1155</span>
                    </div>
                    <div>
                      <p class="text-sm font-medium">{{ approval.contract }}</p>
                      <p class="font-mono text-xs text-gray-500">
                        {{ approval.address.slice(0, 6) }}...{{ approval.address.slice(-4) }}
                      </p>
                    </div>
                  </div>
                  <span class="text-primary font-mono text-sm">Approved</span>
                </div>
              </div>
            </div>
          </div>

          <div class="collapse collapse-plus bg-base-200 rounded-xl mb-4">
            <input type="checkbox" />
            <div class="collapse-title text-xl font-medium px-6 py-4">
              <div class="flex items-center gap-3">
                <IconifyIcon icon="heroicons:users" class="w-6 h-6 text-primary" />
                <div class="text-left">
                  <p class="text-lg font-semibold">Safe Owners</p>
                  <p class="text-sm text-gray-500">Add CNC Safe owners</p>
                </div>
              </div>
            </div>
            <div class="collapse-content px-6 pb-4">
              <div class="space-y-2">
                <div
                  v-for="(owner, index) in systemOwners"
                  :key="index"
                  class="flex items-center justify-between bg-base-300 p-3 rounded-lg"
                >
                  <div>
                    <p class="text-sm font-medium">{{ owner.label }}</p>
                    <p class="font-mono text-xs text-gray-500">{{ owner.address }}</p>
                  </div>
                  <IconifyIcon icon="heroicons:check-circle" class="w-4 h-4 text-green-500" />
                </div>
              </div>
              <p class="text-xs text-gray-500 mt-3">
                Threshold: 2 of {{ systemOwners.length }} signatures required
              </p>
            </div>
          </div>

          <!-- Batch indicator -->
          <div class="flex items-center justify-center gap-2 text-sm text-gray-500">
            <IconifyIcon icon="heroicons:cog-6-tooth" class="w-4 h-4" />
            <span>Batching 3 actions into 1 transaction</span>
          </div>

          <ButtonUI
            @click="handleStepAction"
            :disabled="isProcessing"
            variant="success"
            size="lg"
            class="w-full text-white"
          >
            <IconifyIcon
              v-if="isProcessing"
              icon="heroicons:arrow-path"
              class="w-4 h-4 animate-spin"
            />
            {{ isProcessing ? 'Executing Batch Transaction...' : 'Approve & Add Owners' }}
          </ButtonUI>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { Icon as IconifyIcon } from '@iconify/vue'
import ButtonUI from '@/components/ButtonUI.vue'

const props = defineProps({
  onComplete: {
    type: Function,
    required: true
  }
})

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

const systemOwners = [
  { address: '0x1234...5678', label: 'Treasury Signer' },
  { address: '0x8765...4321', label: 'Council Member 1' },
  { address: '0x9876...1234', label: 'Council Member 2' }
]

const usdcApprovals = [
  { contract: 'CTF Contract', address: '0x4d97dcd97ec945f40cf65f87097ace5ea0476045' },
  { contract: 'CTF Exchange', address: '0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E' },
  { contract: 'Neg Risk CTF Exchange', address: '0xC5d563A36AE78145C45a50134d48A1215220f80a' },
  { contract: 'Neg Risk Adapter', address: '0xd91E80cF2E7be2e162c6513ceD06f1dD0dA35296' }
]

const outcomeTokenApprovals = [
  { contract: 'CTF Exchange', address: '0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E' },
  { contract: 'Neg Risk CTF Exchange', address: '0xC5d563A36AE78145C45a50134d48A1215220f80a' },
  { contract: 'Neg Risk Adapter', address: '0xd91E80cF2E7be2e162c6513ceD06f1dD0dA35296' }
]

const handleStepAction = async () => {
  isProcessing.value = true
  // Simulate blockchain transaction
  await new Promise((resolve) => setTimeout(resolve, 2000))
  isProcessing.value = false

  if (currentStep.value < steps.length) {
    currentStep.value = currentStep.value + 1
  } else {
    props.onComplete()
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
