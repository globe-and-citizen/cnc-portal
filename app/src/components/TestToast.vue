<template>
  <div v-if="visible">
    <div :class="['alert', typeClass]">
      <IconifyIcon icon="heroicons:check-circle" class="size-6" v-if="type === ToastType.Success" />
      <IconifyIcon
        icon="heroicons:information-circle"
        class="size-6"
        v-if="type === ToastType.Info"
      />
      <IconifyIcon
        icon="heroicons:exclamation-circle"
        class="size-6"
        v-if="type === ToastType.Warning"
      />
      <IconifyIcon icon="heroicons:x-circle" class="size-6" v-if="type === ToastType.Error" />
      <span>{{ message }} - {{ timeLeft }}s</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, onUnmounted } from 'vue'
import { ToastType, type Toast } from '@/types'
import { Icon as IconifyIcon } from '@iconify/vue'

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
