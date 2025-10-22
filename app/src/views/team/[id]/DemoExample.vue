<template>
  <div>
    <ButtonUI variant="primary" @click="executeWrite()">Pause Bank</ButtonUI>
    <ButtonUI variant="secondary" @click="executeUnPause()">Unpause Bank</ButtonUI>
    <h2>
      Bank paused Status is <span class="text-red-500">{{ pauseResult.data }}</span>
    </h2>
    <div>{{ gasEstimateError?.name }}</div>
    ds
    <div>{{ gasEstimateError?.message }}</div>

    <!-- Timeline Demo -->
    <div class="card bg-base-100 shadow-xl">
      <div class="card-body">
        <h2 class="card-title mb-6">Bank Pause Operation</h2>

        <TransactionTimeline
          :show="true"
          :steps="currentTimelineSteps"
          title="Bank Pause Operation"
        />
      </div>
    </div>
    <div class="flex">
      <pre>{{ pauseResult }}</pre>
      <pre>
    {{
          {
            currentStep,
            isLoading,
            isWritePending,
            isConfirming,
            isConfirmed,
            writeContractData, //not showing by default
            // receipt, // showing by default
            error,
            // gasEstimate,
            isEstimatingGas,
            gasEstimateError
            // refetchGasEstimate()
          }
        }}</pre
      >
    </div>
  </div>
</template>

<script setup lang="ts">
import ButtonUI from '@/components/ButtonUI.vue'
import TransactionTimeline from '@/components/ui/TransactionTimeline.vue'
import { useBankReads } from '@/composables/bank'
import { usePause, useUnpause } from '@/composables/bank/bankWrites'
import { useTransactionTimeline } from '@/composables/useTransactionTimeline'

const { useBankPaused } = useBankReads()

// Get contract data with loading and error states
const pauseResult = useBankPaused()

const {
  // Loading states
  isLoading,
  isWritePending,
  isConfirming,
  isConfirmed,

  // Data
  writeContractData,
  receipt,
  error,

  // Gas estimation
  gasEstimate,
  isEstimatingGas,
  gasEstimateError,

  // Core functions
  executeWrite
} = usePause()

const { executeWrite: executeUnPause } = useUnpause()

// Use transaction timeline composable
const {
  currentStep,
  timelineSteps: currentTimelineSteps
} = useTransactionTimeline({
  isEstimatingGas,
  gasEstimateError,
  gasEstimate,
  isWritePending,
  error,
  writeContractData,
  isConfirming,
  isConfirmed,
  receipt
})
</script>

<style scoped></style>
