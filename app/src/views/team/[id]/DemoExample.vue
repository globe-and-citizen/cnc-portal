<template>
  <div>
    <div class="flex gap-8">
      <ButtonUI variant="primary" @click="executeWrite()">Pause Bank</ButtonUI>
      <ButtonUI variant="secondary" @click="executeUnPause()">Unpause Bank</ButtonUI>
    </div>
    <h2>
      Bank paused Status is <span class="text-red-500">{{ pauseResult.data }}</span>
    </h2>
    <!-- Timeline Demo -->
    <div class="card bg-base-100 shadow-xl">
      <div class="card-body">
        <h2 class="card-title mb-6">Bank Pause Operation</h2>

        <div class="flex flex-row">
          <TransactionTimeline
            :show="true"
            :steps="pauseTimelineSteps"
            title="Bank Pause Operation"
          />
          <TransactionTimeline
            :show="true"
            :steps="unpauseTimelineSteps"
            title="Bank Un Pause Operation"
          />
        </div>
      </div>
    </div>
    <div class="flex">
      <pre>{{ pauseResult }}</pre>
    </div>
  </div>
</template>

<script setup lang="ts">
import ButtonUI from '@/components/ButtonUI.vue'
import TransactionTimeline from '@/components/ui/TransactionTimeline.vue'
import { useBankReads } from '@/composables/bank'
import { usePause, useUnpause } from '@/composables/bank/bankWrites'
// import { useTransactionTimeline } from '@/composables/useTransactionTimeline'

const { useBankPaused } = useBankReads()

// Get contract data with loading and error states
const pauseResult = useBankPaused()

const { timelineSteps: pauseTimelineSteps, executeWrite } = usePause()

const { executeWrite: executeUnPause, timelineSteps: unpauseTimelineSteps } = useUnpause()
</script>

<style scoped></style>
