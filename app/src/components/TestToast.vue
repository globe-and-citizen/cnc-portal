<template>
  <div v-if="visible">
    <div :class="['alert', typeClass]">
      <IconCheck v-if="type === ToastType.Success" />
      <IconInfo v-if="type === ToastType.Info" />
      <IconWarning v-if="type === ToastType.Warning" />
      <IconError v-if="type === ToastType.Error" />
      <span>{{ message }} - {{ timeLeft }}s</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineProps, ref, onMounted, computed, onUnmounted } from 'vue'
import { ToastType } from '@/types'
import IconCheck from '@/components/icons/IconCheck.vue'
import IconInfo from '@/components/icons/IconInfo.vue'
import IconWarning from '@/components/icons/IconWarning.vue'
import IconError from '@/components/icons/IconError.vue'

interface ToastProps {
  type: ToastType; 
  message: string; 
  timeout: number
}

const props = defineProps<ToastProps>()

const visible = ref(true)
const timeLeft = ref(props.timeout / 1000)
let interval: number

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
  setInterval(updateTimeLeft, 1000)
  setTimeout(() => {
    visible.value = false
  }, props.timeout)
})

onUnmounted(() => {
  clearInterval(interval)
})
</script>
