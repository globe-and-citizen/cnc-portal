<template>
  <div class="flex flex-col py-6 text-center items-center justify-center">
    <h2>Pause Contract</h2>
    <p class="my-2">
      Contract status: <span class="font-bold">{{ isPaused ? 'Paused' : 'Active' }}</span>
    </p>
    <LoadingButton
      class="w-40 my-6"
      color="primary"
      v-if="isPaused ? unpauseLoading : pauseLoading"
    />
    <button v-else class="btn btn-primary w-40 my-6" @click="isPaused ? unpause() : pause()">
      {{ isPaused ? 'Unpause' : 'Pause' }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { BankService } from '@/services/bankService'
import { onMounted, ref, watch } from 'vue'
import { useBankPause, useBankUnpause } from '@/composables/bank'
import LoadingButton from '@/components/LoadingButton.vue'
import { useToastStore } from '@/stores/useToastStore'

const bankService = new BankService()
const { addSuccessToast, addErrorToast } = useToastStore()
const isPaused = ref(false)
const props = defineProps<{
  teamAddress: string
}>()
const {
  execute: pause,
  isLoading: pauseLoading,
  isSuccess: pauseSuccess,
  error: pauseError
} = useBankPause(props.teamAddress)
const {
  execute: unpause,
  isLoading: unpauseLoading,
  isSuccess: unpauseSuccess,
  error: unpauseError
} = useBankUnpause(props.teamAddress)

onMounted(async () => {
  isPaused.value = await bankService.isPaused(props.teamAddress)
})

watch(pauseSuccess, () => {
  if (pauseSuccess.value) {
    isPaused.value = true
    addSuccessToast('Contract pause successfully')
  }
})
watch(pauseError, () => {
  if (pauseError.value) {
    addErrorToast('Failed to pause contract')
  }
})
watch(unpauseSuccess, () => {
  if (unpauseSuccess.value) {
    isPaused.value = false
    addSuccessToast('Contract unpause successfully')
  }
})
watch(unpauseError, () => {
  if (unpauseError.value) {
    addErrorToast('Failed to unpause contract')
  }
})
</script>
