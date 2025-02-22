<template>
  <div v-if="visible">
    <div :class="['alert', typeClass]">
      <CheckCircleIcon class="size-6" v-if="type === ToastType.Success" />
      <InformationCircleIcon class="size-6" v-if="type === ToastType.Info" />
      <ExclamationCircleIcon class="size-6" v-if="type === ToastType.Warning" />
      <XCircleIcon class="size-6" v-if="type === ToastType.Error" />
      <span>{{ message }} - {{ timeLeft }}s</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineProps, ref, onMounted, computed, onUnmounted } from 'vue'
import { ToastType, type Toast } from '@/types'
import {
  CheckCircleIcon,
  InformationCircleIcon,
  XCircleIcon,
  ExclamationCircleIcon
} from '@heroicons/vue/24/outline'

const props = defineProps<Toast>()

const visible = ref(true)
const timeLeft = ref(props.timeout / 1000)
let interval: ReturnType<typeof setInterval>

const typeClass = computed(() => {
  return {
    'alert-success': props.type === ToastType.Success,
    'alert-info': props.type === ToastType.Info,
    'alert-warning': props.type === ToastType.Warning,
    'alert-error': props.type === ToastType.Error
  }
})

const updateTimeLeft = () => {
  timeLeft.value -= 1
  if (timeLeft.value <= 0) {
    clearInterval(interval)
  }
}

onMounted(() => {
  interval = setInterval(updateTimeLeft, 1000)
})

onUnmounted(() => {
  clearInterval(interval)
})
</script>
