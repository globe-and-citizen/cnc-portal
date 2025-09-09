<template>
  <div v-if="show" class="mb-6" data-test="transaction-timeline">
    <h5 class="text-sm font-medium mb-3">{{ title || 'Transaction Progress' }}</h5>
    <ul class="timeline timeline-vertical timeline-compact">
      <!-- Step 1: Initiate Transaction -->
      <li>
        <div class="timeline-end timeline-box">
          <div class="flex items-center gap-2">
            <span class="font-medium" :class="initiateTextColor">{{
              steps.initiate.title || 'Initiate'
            }}</span>
          </div>
          <p class="text-sm text-gray-600 mt-1">{{ steps.initiate.description }}</p>
        </div>
        <div class="timeline-middle">
          <TimelineIcon :status="steps.initiate.status" />
        </div>
        <hr :class="initiateHrColor" />
      </li>

      <!-- Step 2: Transaction Pending -->
      <li>
        <hr :class="pendingHrColor" />
        <div class="timeline-middle">
          <TimelineIcon :status="steps.pending.status" />
        </div>
        <div class="timeline-end timeline-box">
          <div class="flex items-center gap-2">
            <span class="font-medium" :class="pendingTextColor">{{
              steps.pending.title || 'Transaction Sent'
            }}</span>
          </div>
          <p class="text-sm text-gray-600 mt-1">{{ steps.pending.description }}</p>
          <div v-if="transactionHash" class="text-xs font-mono text-gray-500 mt-1">
            Hash: {{ transactionHash.slice(0, 10) }}...{{ transactionHash.slice(-8) }}
          </div>
        </div>
        <hr :class="confirmingHrColor" />
      </li>

      <!-- Step 3: Transaction Confirming -->
      <li>
        <hr :class="confirmingHrColor" />
        <div class="timeline-middle">
          <TimelineIcon :status="steps.confirming.status" />
        </div>
        <div class="timeline-end timeline-box">
          <div class="flex items-center gap-2">
            <span class="font-medium" :class="confirmingTextColor">{{
              steps.confirming.title || 'Confirming'
            }}</span>
          </div>
          <p class="text-sm text-gray-600 mt-1">{{ steps.confirming.description }}</p>
        </div>
        <hr :class="completeHrColor" />
      </li>

      <!-- Step 4: Complete -->
      <li>
        <hr :class="completeHrColor" />
        <div class="timeline-middle">
          <TimelineIcon :status="steps.complete.status" />
        </div>
        <div class="timeline-end timeline-box">
          <div class="flex items-center gap-2">
            <span class="font-medium" :class="completeTextColor">{{
              steps.complete.title || 'Complete'
            }}</span>
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
import { computed } from 'vue'
import TimelineIcon from './TimelineIcon.vue'

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

const props = defineProps<Props>()

// Helper function to get timeline colors based on status
const getStatusColor = (status: TimelineStep['status']) => {
  switch (status) {
    case 'completed':
      return 'bg-success'
    case 'active':
      return 'bg-primary'
    case 'error':
      return 'bg-error'
    case 'pending':
    default:
      return 'bg-gray-300'
  }
}

// Helper function to get text colors based on status
const getTextColor = (status: TimelineStep['status']) => {
  switch (status) {
    case 'completed':
      return 'text-success'
    case 'active':
      return 'text-primary'
    case 'error':
      return 'text-error'
    case 'pending':
    default:
      return 'text-gray-600'
  }
}

// Computed properties for each step's colors
const initiateHrColor = computed(() => getStatusColor(props.steps.initiate.status))
const initiateTextColor = computed(() => getTextColor(props.steps.initiate.status))

const pendingHrColor = computed(() => getStatusColor(props.steps.pending.status))
const pendingTextColor = computed(() => getTextColor(props.steps.pending.status))

const confirmingHrColor = computed(() => getStatusColor(props.steps.confirming.status))
const confirmingTextColor = computed(() => getTextColor(props.steps.confirming.status))

const completeHrColor = computed(() => getStatusColor(props.steps.complete.status))
const completeTextColor = computed(() => getTextColor(props.steps.complete.status))
</script>
