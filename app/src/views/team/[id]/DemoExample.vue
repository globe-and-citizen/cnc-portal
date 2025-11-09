<template>
  <div>
    <div class="flex gap-8">
      <ButtonUI variant="primary" @click="pauseResult.executeWrite()">Pause Bank</ButtonUI>
      <ButtonUI variant="secondary" @click="unpauseResult.executeWrite()">Unpause Bank</ButtonUI>
    </div>
    <h2>
      Bank paused Status is <span class="text-red-500">{{ pauseStatus.data }}</span>
    </h2>
    <div class="card bg-base-100 shadow-xl">
      <div class="card-body">
        <h2 class="card-title mb-6">Bank Pause Operation</h2>

        <div class="flex flex-row">
          <TransactionTimeline
            v-if="pauseResult.timelineSteps.value"
            :show="true"
            :steps="pauseResult.timelineSteps.value"
            title="Bank Pause Operation"
          />
          <TransactionTimeline
            v-if="unpauseResult.timelineSteps.value"
            :show="true"
            :steps="unpauseResult.timelineSteps.value"
            title="Bank UnPause Operation"
          />
        </div>
      </div>
    </div>
    <div class="flex">
      <pre>{{ pauseStatus }}</pre>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useBankReads } from '@/composables/bank'
import { usePause, useUnpause } from '@/composables/bank/bankWrites'
import ButtonUI from '@/components/ButtonUI.vue'
import TransactionTimeline from '@/components/ui/TransactionTimeline.vue'

const { useBankPaused } = useBankReads()

// Get contract data with loading and error states
const pauseStatus = useBankPaused()
const pauseResult = usePause()
const unpauseResult = useUnpause()
</script>

<style scoped></style>
