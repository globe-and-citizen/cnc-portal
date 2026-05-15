<template>
  <div v-if="show" class="mb-6" data-test="transaction-timeline">
    <h5 class="mb-3 text-sm font-medium">{{ title || 'Transaction Progress' }}</h5>
    <ol class="flex flex-col">
      <li
        v-for="(step, index) in orderedSteps"
        :key="step.key"
        class="relative grid grid-cols-[auto_1fr] gap-x-3"
      >
        <div class="flex flex-col items-center">
          <TimelineIcon :status="step.status" />
          <div
            v-if="index < orderedSteps.length - 1"
            class="my-1 w-0.5 flex-1"
            :class="step.connectorColor"
          />
        </div>
        <div
          class="mb-4 rounded-md border border-gray-200 bg-white px-3 py-2 dark:bg-gray-900"
          :class="{ 'mb-0': index === orderedSteps.length - 1 }"
        >
          <div class="flex items-center gap-2">
            <span class="font-medium" :class="step.textColor">{{ step.title }}</span>
          </div>
          <p class="mt-1 text-sm text-gray-600">{{ step.description }}</p>
          <div v-if="step.hashLine" class="mt-1 font-mono text-xs text-gray-500">
            {{ step.hashLine }}
          </div>
          <div v-if="step.blockLine" class="mt-1 font-mono text-xs text-gray-500">
            {{ step.blockLine }}
          </div>
        </div>
      </li>
    </ol>
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

const getConnectorColor = (status: TimelineStep['status']) => {
  switch (status) {
    case 'completed':
      return 'bg-success'
    case 'active':
      return 'bg-primary'
    case 'error':
      return 'bg-error'
    default:
      return 'bg-gray-300'
  }
}

const getTextColor = (status: TimelineStep['status']) => {
  switch (status) {
    case 'completed':
      return 'text-success'
    case 'active':
      return 'text-primary'
    case 'error':
      return 'text-error'
    default:
      return 'text-gray-600'
  }
}

const orderedSteps = computed(() => [
  {
    key: 'initiate',
    status: props.steps.initiate.status,
    title: props.steps.initiate.title || 'Initiate',
    description: props.steps.initiate.description,
    textColor: getTextColor(props.steps.initiate.status),
    connectorColor: getConnectorColor(props.steps.initiate.status)
  },
  {
    key: 'pending',
    status: props.steps.pending.status,
    title: props.steps.pending.title || 'Transaction Sent',
    description: props.steps.pending.description,
    textColor: getTextColor(props.steps.pending.status),
    connectorColor: getConnectorColor(props.steps.pending.status),
    hashLine: props.transactionHash
      ? `Hash: ${props.transactionHash.slice(0, 10)}...${props.transactionHash.slice(-8)}`
      : undefined
  },
  {
    key: 'confirming',
    status: props.steps.confirming.status,
    title: props.steps.confirming.title || 'Confirming',
    description: props.steps.confirming.description,
    textColor: getTextColor(props.steps.confirming.status),
    connectorColor: getConnectorColor(props.steps.confirming.status)
  },
  {
    key: 'complete',
    status: props.steps.complete.status,
    title: props.steps.complete.title || 'Complete',
    description: props.steps.complete.description,
    textColor: getTextColor(props.steps.complete.status),
    connectorColor: getConnectorColor(props.steps.complete.status),
    blockLine: props.blockNumber ? `Block: ${props.blockNumber}` : undefined
  }
])
</script>
