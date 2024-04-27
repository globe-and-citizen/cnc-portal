<template>
  <div class="toast toast-end">
    <div
      class="alert"
      :class="{
        'alert-success': type === ToastType.Success,
        'alert-info': type === ToastType.Info,
        'alert-warning': type === ToastType.Warning,
        'alert-error': type === ToastType.Error
      }"
    >
      <IconCheck v-if="type === ToastType.Success" />
      <IconInfo v-if="type === ToastType.Info" />
      <IconWarning v-if="type === ToastType.Warning" />
      <IconError v-if="type === ToastType.Error" />
      <span>{{ message }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineProps } from 'vue'
import { ToastType } from '@/types'
import IconCheck from '@/components/icons/IconCheck.vue'
import IconInfo from '@/components/icons/IconInfo.vue'
import IconWarning from '@/components/icons/IconWarning.vue'
import IconError from '@/components/icons/IconError.vue'

defineProps<{ type: ToastType; message: string }>()
</script>
