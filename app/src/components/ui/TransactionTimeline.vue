<template>
  <div v-if="show" class="mb-6" data-test="transaction-timeline">
    <h5 class="text-sm font-medium mb-3">{{ title || 'Transaction Progress' }}</h5>
    <ul class="timeline timeline-vertical">
      <!-- Step 1: Initiate Transaction -->
      <li>
        <div class="timeline-start timeline-box">
          <div class="flex items-center gap-2">
            <div v-if="steps.initiate.status === 'completed'" class="w-4 h-4 bg-success rounded-full flex items-center justify-center">
              <Icon icon="heroicons:check" class="w-3 h-3 text-white" />
            </div>
            <div v-else-if="steps.initiate.status === 'active'" class="loading loading-spinner loading-sm text-primary"></div>
            <div v-else class="w-4 h-4 bg-gray-300 rounded-full"></div>
            <span class="font-medium">{{ steps.initiate.title || 'Initiate' }}</span>
          </div>
          <p class="text-sm text-gray-600 mt-1">{{ steps.initiate.description }}</p>
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
            <div v-if="steps.pending.status === 'completed'" class="w-4 h-4 bg-success rounded-full flex items-center justify-center">
              <Icon icon="heroicons:check" class="w-3 h-3 text-white" />
            </div>
            <div v-else-if="steps.pending.status === 'active'" class="loading loading-spinner loading-sm text-primary"></div>
            <div v-else-if="steps.pending.status === 'error'" class="w-4 h-4 bg-error rounded-full flex items-center justify-center">
              <Icon icon="heroicons:x-mark" class="w-3 h-3 text-white" />
            </div>
            <div v-else class="w-4 h-4 bg-gray-300 rounded-full"></div>
            <span class="font-medium">{{ steps.pending.title || 'Transaction Sent' }}</span>
          </div>
          <p class="text-sm text-gray-600 mt-1">{{ steps.pending.description }}</p>
          <div v-if="transactionHash" class="text-xs font-mono text-gray-500 mt-1">
            Hash: {{ transactionHash.slice(0, 10) }}...{{ transactionHash.slice(-8) }}
          </div>
        </div>
        <hr />
      </li>

      <!-- Step 3: Transaction Confirming -->
      <li>
        <hr />
        <div class="timeline-start timeline-box">
          <div class="flex items-center gap-2">
            <div v-if="steps.confirming.status === 'completed'" class="w-4 h-4 bg-success rounded-full flex items-center justify-center">
              <Icon icon="heroicons:check" class="w-3 h-3 text-white" />
            </div>
            <div v-else-if="steps.confirming.status === 'active'" class="loading loading-spinner loading-sm text-primary"></div>
            <div v-else-if="steps.confirming.status === 'error'" class="w-4 h-4 bg-error rounded-full flex items-center justify-center">
              <Icon icon="heroicons:x-mark" class="w-3 h-3 text-white" />
            </div>
            <div v-else class="w-4 h-4 bg-gray-300 rounded-full"></div>
            <span class="font-medium">{{ steps.confirming.title || 'Confirming' }}</span>
          </div>
          <p class="text-sm text-gray-600 mt-1">{{ steps.confirming.description }}</p>
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
            <div v-if="steps.complete.status === 'completed'" class="w-4 h-4 bg-success rounded-full flex items-center justify-center">
              <Icon icon="heroicons:check" class="w-3 h-3 text-white" />
            </div>
            <div v-else-if="steps.complete.status === 'error'" class="w-4 h-4 bg-error rounded-full flex items-center justify-center">
              <Icon icon="heroicons:x-mark" class="w-3 h-3 text-white" />
            </div>
            <div v-else class="w-4 h-4 bg-gray-300 rounded-full"></div>
            <span class="font-medium">{{ steps.complete.title || 'Complete' }}</span>
          </div>
          <p class="text-sm text-gray-600 mt-1">{{ steps.complete.description }}</p>
          <div v-if="blockNumber" class="text-xs font-mono text-gray-500 mt-1">
            Block: {{ blockNumber }}
          </div>
        </div>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'

export interface TimelineStep {
  status: 'pending' | 'active' | 'completed' | 'error'
  title?: string
  description: string
}

export interface TimelineSteps {
  initiate: TimelineStep
  pending: TimelineStep
  confirming: TimelineStep
  complete: TimelineStep
}

interface Props {
  show: boolean
  title?: string
  steps: TimelineSteps
  transactionHash?: string
  blockNumber?: string | number
}

defineProps<Props>()
</script>
