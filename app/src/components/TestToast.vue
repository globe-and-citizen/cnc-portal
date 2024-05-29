<template>
  <div v-if="visible">
    <div :class="['alert', typeClass]">
      <IconCheck v-if="type === ToastType.Success" />
      <IconInfo v-if="type === ToastType.Info" />
      <IconWarning v-if="type === ToastType.Warning" />
      <IconError v-if="type === ToastType.Error" />
      <span>{{ message }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineProps, ref, onMounted, computed } from 'vue'
import { ToastType } from '@/types'
import IconCheck from '@/components/icons/IconCheck.vue'
import IconInfo from '@/components/icons/IconInfo.vue'
import IconWarning from '@/components/icons/IconWarning.vue'
import IconError from '@/components/icons/IconError.vue'

const props = defineProps<{ type: ToastType; message: string; timeout: number }>()

const visible = ref(true)

const typeClass = computed(() => {
  return {
    'alert-success': props.type === ToastType.Success,
    'alert-info': props.type === ToastType.Info,
    'alert-warning': props.type === ToastType.Warning,
    'alert-error': props.type === ToastType.Error
  }
})

onMounted(() => {
  setTimeout(() => {
    visible.value = false
  }, props.timeout)
})
</script>
