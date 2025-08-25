<template>
  <div class="container mx-auto px-4 py-8">
    <div class="max-w-4xl mx-auto">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-base-content mb-4">Transaction Timeline Demo</h1>
        <p class="text-base-content/70 text-lg">
          Interactive demonstration of the TransactionTimeline component.
        </p>
      </div>

      <!-- Controls -->
      <div class="card bg-base-100 shadow-xl mb-8">
        <div class="card-body">
          <h2 class="card-title mb-4">Timeline Controls</h2>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div class="form-control">
              <label class="label">
                <span class="label-text">Current Step</span>
              </label>
              <select v-model="currentStep" class="select select-bordered">
                <option :value="0">Step 1 - Preparation</option>
                <option :value="1">Step 2 - Approval</option>
                <option :value="2">Step 3 - Execution</option>
                <option :value="3">Step 4 - Confirmation</option>
              </select>
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text">Timeline Type</span>
              </label>
              <select v-model="selectedExample" class="select select-bordered">
                <option value="pause">Bank Pause</option>
                <option value="transfer">Token Transfer</option>
                <option value="vesting">Vesting Creation</option>
              </select>
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text">Include Error</span>
              </label>
              <input v-model="includeError" type="checkbox" class="toggle toggle-primary" />
            </div>
          </div>

          <div class="flex flex-wrap gap-2">
            <button @click="simulateProgress" class="btn btn-primary" :disabled="isSimulating">
              <Icon
                v-if="isSimulating"
                icon="heroicons:arrow-path"
                class="w-4 h-4 animate-spin mr-2"
              />
              {{ isSimulating ? 'Simulating...' : 'Simulate Progress' }}
            </button>

            <button @click="resetTimeline" class="btn btn-outline">
              <Icon icon="heroicons:arrow-path" class="w-4 h-4 mr-2" />
              Reset
            </button>
          </div>
        </div>
      </div>

      <!-- Timeline Demo -->
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h2 class="card-title mb-6">
            {{ timelineExamples[selectedExample].title }}
          </h2>

          <TransactionTimeline
            :show="true"
            :steps="currentTimelineSteps"
            :title="timelineExamples[selectedExample].title"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Icon } from '@iconify/vue'
import TransactionTimeline from '@/components/ui/TransactionTimeline.vue'
import type { TimelineSteps } from '@/components/ui/TransactionTimeline.vue'

// Reactive state
const currentStep = ref(0)
const selectedExample = ref<'pause' | 'transfer' | 'vesting'>('pause')
const includeError = ref(false)
const isSimulating = ref(false)

// Timeline examples
const timelineExamples = {
  pause: {
    title: 'Bank Pause Operation',
    steps: {
      initiate: {
        title: 'Prepare Transaction',
        description: 'Validating contract and preparing pause operation'
      },
      pending: {
        title: 'Approve Operation',
        description: 'Requesting user approval for pause transaction'
      },
      confirming: {
        title: 'Execute Pause',
        description: 'Broadcasting pause transaction to blockchain'
      },
      complete: {
        title: 'Confirm Transaction',
        description: 'Waiting for blockchain confirmation'
      }
    }
  },
  transfer: {
    title: 'Token Transfer',
    steps: {
      initiate: {
        title: 'Validate Transfer',
        description: 'Checking balance and validating recipient address'
      },
      pending: {
        title: 'Approve Tokens',
        description: 'Approving token allowance for transfer'
      },
      confirming: {
        title: 'Execute Transfer',
        description: 'Sending tokens to recipient address'
      },
      complete: {
        title: 'Verify Receipt',
        description: 'Confirming tokens received by recipient'
      }
    }
  },
  vesting: {
    title: 'Vesting Schedule Creation',
    steps: {
      initiate: {
        title: 'Setup Parameters',
        description: 'Configuring vesting schedule and beneficiary'
      },
      pending: {
        title: 'Lock Tokens',
        description: 'Locking tokens in vesting contract'
      },
      confirming: {
        title: 'Create Schedule',
        description: 'Creating vesting schedule on blockchain'
      },
      complete: {
        title: 'Activate Vesting',
        description: 'Activating vesting schedule for beneficiary'
      }
    }
  }
} as const

// Computed properties
const currentTimelineSteps = computed((): TimelineSteps => {
  const stepKeys = ['initiate', 'pending', 'confirming', 'complete'] as const
  const selectedSteps = timelineExamples[selectedExample.value].steps

  const result: TimelineSteps = {
    initiate: {
      title: selectedSteps.initiate.title,
      description: selectedSteps.initiate.description,
      status: 'pending'
    },
    pending: {
      title: selectedSteps.pending.title,
      description: selectedSteps.pending.description,
      status: 'pending'
    },
    confirming: {
      title: selectedSteps.confirming.title,
      description: selectedSteps.confirming.description,
      status: 'pending'
    },
    complete: {
      title: selectedSteps.complete.title,
      description: selectedSteps.complete.description,
      status: 'pending'
    }
  }

  // Update steps based on current step
  stepKeys.forEach((key, index) => {
    if (index < currentStep.value) {
      result[key].status = 'completed'
    } else if (index === currentStep.value) {
      if (includeError.value && index === 2) {
        result[key].status = 'error'
      } else {
        result[key].status = 'active'
      }
    } else {
      result[key].status = 'pending'
    }
  })

  return result
})

// Timeline control functions
const simulateProgress = async () => {
  isSimulating.value = true
  currentStep.value = 0

  for (let i = 0; i <= 3; i++) {
    await new Promise((resolve) => setTimeout(resolve, 1000))
    currentStep.value = i
  }

  isSimulating.value = false
}

const resetTimeline = () => {
  currentStep.value = 0
  includeError.value = false
  isSimulating.value = false
}

// Watch for example changes and reset
watch(selectedExample, () => {
  resetTimeline()
})
</script>
