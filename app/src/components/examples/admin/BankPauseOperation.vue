<template>
  <div class="bank-pause-operation mb-6">
    <h4 class="text-md font-semibold mb-3">Pause/Unpause Contract</h4>

    <!-- Current Status -->
    <div class="mb-4 p-3 bg-gray-50 rounded-md">
      <h5 class="text-sm font-medium mb-2">Current Contract Status</h5>
      <div class="flex items-center gap-2">
        <span class="text-sm font-medium">Contract is:</span>
        <span v-if="isReadLoading" class="text-sm text-gray-500" data-test="pause-status-loading">
          Loading...
        </span>
        <span v-else-if="readError" class="text-sm text-red-600" data-test="pause-status-error">
          Error loading status
        </span>
        <span
          v-else
          :class="isPaused ? 'text-red-600 font-semibold' : 'text-green-600 font-semibold'"
          data-test="pause-status"
        >
          {{ isPaused ? 'PAUSED' : 'ACTIVE' }}
        </span>
      </div>
    </div>

    <!-- Action Buttons -->
    <div class="flex gap-3 mb-4">
      <button
        @click="handlePauseContract"
        :disabled="!isBankAddressValid || isLoading || Boolean(isPaused)"
        class="btn btn-error"
        data-test="pause-contract-btn"
      >
        <span
          v-if="isLoading && currentOperation === 'pause'"
          class="loading loading-spinner loading-sm"
        ></span>
        Pause Contract
      </button>
      <button
        @click="handleUnpauseContract"
        :disabled="!isBankAddressValid || isLoading || !Boolean(isPaused)"
        class="btn btn-success"
        data-test="unpause-contract-btn"
      >
        <span
          v-if="isLoading && currentOperation === 'unpause'"
          class="loading loading-spinner loading-sm"
        ></span>
        Unpause Contract
      </button>
    </div>

    <!-- Transaction Timeline -->
    <div v-if="showTimeline" class="mb-6" data-test="transaction-timeline">
      <h5 class="text-sm font-medium mb-3">Transaction Progress</h5>
      <ul class="timeline timeline-vertical">
        <!-- Step 1: Initiate Transaction -->
        <li>
          <div class="timeline-start timeline-box">
            <div class="flex items-center gap-2">
              <div
                v-if="timelineSteps.initiate.status === 'completed'"
                class="w-4 h-4 bg-success rounded-full flex items-center justify-center"
              >
                <svg class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fill-rule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clip-rule="evenodd"
                  />
                </svg>
              </div>
              <div
                v-else-if="timelineSteps.initiate.status === 'active'"
                class="loading loading-spinner loading-sm text-primary"
              ></div>
              <div v-else class="w-4 h-4 bg-gray-300 rounded-full"></div>
              <span class="font-medium"
                >{{ currentOperation === 'pause' ? 'Pause' : 'Unpause' }} Transaction</span
              >
            </div>
            <p class="text-sm text-gray-600 mt-1">{{ timelineSteps.initiate.description }}</p>
          </div>
          <div class="timeline-middle">
            <div class="w-2 h-2 bg-primary rounded-full"></div>
          </div>
          <hr class="bg-primary" />
        </li>

        <!-- Step 2: Transaction Pending -->
        <li>
          <hr class="bg-primary" />
          <div class="timeline-middle">
            <div class="w-2 h-2 bg-primary rounded-full"></div>
          </div>
          <div class="timeline-end timeline-box">
            <div class="flex items-center gap-2">
              <div
                v-if="timelineSteps.pending.status === 'completed'"
                class="w-4 h-4 bg-success rounded-full flex items-center justify-center"
              >
                <svg class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fill-rule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clip-rule="evenodd"
                  />
                </svg>
              </div>
              <div
                v-else-if="timelineSteps.pending.status === 'active'"
                class="loading loading-spinner loading-sm text-primary"
              ></div>
              <div
                v-else-if="timelineSteps.pending.status === 'error'"
                class="w-4 h-4 bg-error rounded-full flex items-center justify-center"
              >
                <svg class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fill-rule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clip-rule="evenodd"
                  />
                </svg>
              </div>
              <div v-else class="w-4 h-4 bg-gray-300 rounded-full"></div>
              <span class="font-medium">Transaction Sent</span>
            </div>
            <p class="text-sm text-gray-600 mt-1">{{ timelineSteps.pending.description }}</p>
            <div v-if="writeContractData" class="text-xs font-mono text-gray-500 mt-1">
              Hash: {{ writeContractData.slice(0, 10) }}...{{ writeContractData.slice(-8) }}
            </div>
          </div>
          <hr />
        </li>

        <!-- Step 3: Transaction Confirming -->
        <li>
          <hr />
          <div class="timeline-start timeline-box">
            <div class="flex items-center gap-2">
              <div
                v-if="timelineSteps.confirming.status === 'completed'"
                class="w-4 h-4 bg-success rounded-full flex items-center justify-center"
              >
                <svg class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fill-rule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clip-rule="evenodd"
                  />
                </svg>
              </div>
              <div
                v-else-if="timelineSteps.confirming.status === 'active'"
                class="loading loading-spinner loading-sm text-primary"
              ></div>
              <div
                v-else-if="timelineSteps.confirming.status === 'error'"
                class="w-4 h-4 bg-error rounded-full flex items-center justify-center"
              >
                <svg class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fill-rule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clip-rule="evenodd"
                  />
                </svg>
              </div>
              <div v-else class="w-4 h-4 bg-gray-300 rounded-full"></div>
              <span class="font-medium">Confirming on Blockchain</span>
            </div>
            <p class="text-sm text-gray-600 mt-1">{{ timelineSteps.confirming.description }}</p>
          </div>
          <div class="timeline-middle">
            <div class="w-2 h-2 bg-primary rounded-full"></div>
          </div>
          <hr />
        </li>

        <!-- Step 4: Complete -->
        <li>
          <hr />
          <div class="timeline-middle">
            <div class="w-2 h-2 bg-primary rounded-full"></div>
          </div>
          <div class="timeline-end timeline-box">
            <div class="flex items-center gap-2">
              <div
                v-if="timelineSteps.complete.status === 'completed'"
                class="w-4 h-4 bg-success rounded-full flex items-center justify-center"
              >
                <svg class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fill-rule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clip-rule="evenodd"
                  />
                </svg>
              </div>
              <div
                v-else-if="timelineSteps.complete.status === 'error'"
                class="w-4 h-4 bg-error rounded-full flex items-center justify-center"
              >
                <svg class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fill-rule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clip-rule="evenodd"
                  />
                </svg>
              </div>
              <div v-else class="w-4 h-4 bg-gray-300 rounded-full"></div>
              <span class="font-medium">Transaction Complete</span>
            </div>
            <p class="text-sm text-gray-600 mt-1">{{ timelineSteps.complete.description }}</p>
            <div v-if="receipt" class="text-xs font-mono text-gray-500 mt-1">
              Block: {{ receipt.blockNumber }}
            </div>
          </div>
        </li>
      </ul>
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
            <td class="font-medium">Read Loading</td>
            <td>{{ isReadLoading }}</td>
          </tr>
          <tr>
            <td class="font-medium">Current Pause Status</td>
            <td>
              <span
                :class="
                  Boolean(isPaused) ? 'text-error font-semibold' : 'text-success font-semibold'
                "
              >
                {{ Boolean(isPaused) ? 'PAUSED' : 'ACTIVE' }}
              </span>
            </td>
          </tr>
          <tr>
            <td class="font-medium">Is Write Loading</td>
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
          <tr v-if="error">
            <td class="font-medium">Error</td>
            <td class="text-error">{{ error.message }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useBankContract } from '@/composables/bank'

const {
  isBankAddressValid,
  useBankPaused,
  isLoading,
  isWritePending,
  isConfirming,
  isConfirmed,
  writeContractData,
  receipt,
  error: writeError,
  pauseContract,
  unpauseContract
} = useBankContract()

const { data: isPaused, isLoading: isReadLoading, error: readError } = useBankPaused()

const showTimeline = ref(false)
const currentOperation = ref<'pause' | 'unpause' | null>(null)

const timelineSteps = computed(() => {
  const operation = currentOperation.value
  const operationText = operation === 'pause' ? 'pause' : 'unpause'
  const operationPastText = operation === 'pause' ? 'paused' : 'unpaused'

  return {
    initiate: {
      status: showTimeline.value ? 'completed' : 'pending',
      description: `Initiating ${operationText} transaction...`
    },
    pending: {
      status: isWritePending.value
        ? 'active'
        : writeContractData.value
          ? 'completed'
          : writeError.value
            ? 'error'
            : 'pending',
      description: writeError.value
        ? `Transaction failed: ${writeError.value.message}`
        : writeContractData.value
          ? 'Transaction sent to blockchain'
          : 'Waiting for transaction to be sent...'
    },
    confirming: {
      status: isConfirming.value
        ? 'active'
        : isConfirmed.value
          ? 'completed'
          : writeError.value
            ? 'error'
            : writeContractData.value
              ? 'pending'
              : 'pending',
      description: isConfirmed.value
        ? 'Transaction confirmed on blockchain'
        : isConfirming.value
          ? 'Waiting for blockchain confirmation...'
          : writeError.value
            ? 'Transaction confirmation failed'
            : 'Waiting for confirmation to start...'
    },
    complete: {
      status:
        isConfirmed.value && receipt.value ? 'completed' : writeError.value ? 'error' : 'pending',
      description:
        isConfirmed.value && receipt.value
          ? `Contract successfully ${operationPastText}!`
          : writeError.value
            ? `Failed to ${operationText} contract`
            : `Waiting for ${operationText} operation to complete...`
    }
  }
})

watch(isConfirmed, (confirmed) => {
  if (confirmed && receipt.value) {
    setTimeout(() => {
      showTimeline.value = false
      currentOperation.value = null
    }, 3000)
  }
})

watch(writeError, (error) => {
  if (error) {
    setTimeout(() => {
      showTimeline.value = false
      currentOperation.value = null
    }, 5000)
  }
})

const error = computed(() => readError.value)

const handlePauseContract = async () => {
  currentOperation.value = 'pause'
  showTimeline.value = true
  await pauseContract()
}

const handleUnpauseContract = async () => {
  currentOperation.value = 'unpause'
  showTimeline.value = true
  await unpauseContract()
}
</script>
