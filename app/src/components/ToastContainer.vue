<template>
  <div :class="['toast', positionClass]" data-test="toast-container">
    <Toast
      v-for="toast in toastStore.toasts"
      :key="toast.id"
      :message="toast.message"
      :type="toast.type"
      :timeout="toast.timeout"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useToastStore } from '@/stores/useToastStore'
import Toast from '@/components/TestToast.vue'

const toastStore = useToastStore()
const props = defineProps<{ position: string }>()
const positionClass = computed(() => {
  return {
    'toast-end': props.position === 'bottom-right',
    'toast-center': props.position === 'bottom-center',
    'toast-start': props.position === 'bottom-left',
    'toast-middle toast-start': props.position === 'middle-left',
    'toast-middle toast-center': props.position === 'middle-center',
    'toast-middle toast-end': props.position === 'middle-right',
    'toast-top toast-start': props.position === 'top-left',
    'toast-top toast-center': props.position === 'top-center',
    'toast-top toast-end': props.position === 'top-right'
  }
})
</script>
