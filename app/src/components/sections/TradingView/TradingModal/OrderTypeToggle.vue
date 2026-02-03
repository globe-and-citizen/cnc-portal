<template>
  <div class="space-y-2">
    <label class="text-sm text-gray-500">Order Type</label>
    <div class="grid grid-cols-2 gap-3">
      <button
        @click="$emit('set-order-type', 'market')"
        :class="[
          'h-14 rounded-lg flex items-center px-4 transition-all duration-200',
          orderType === 'market' ? 'btn btn-primary' : 'btn btn-ghost border border-base-300'
        ]"
      >
        <icon icon="heroicons:arrow-trending-up" class="w-5 h-5 mr-2" />
        <div class="text-left">
          <div>Market</div>
          <div class="text-xs opacity-80">Instant execution</div>
        </div>
      </button>
      <button
        @click="$emit('set-order-type', 'limit')"
        :class="[
          'h-14 rounded-lg flex items-center px-4 transition-all duration-200',
          orderType === 'limit' ? 'btn btn-primary' : 'btn btn-ghost border border-base-300'
        ]"
      >
        <icon icon="heroicons:arrow-trending-down" class="w-5 h-5 mr-2" />
        <div class="text-left">
          <div>Limit</div>
          <div class="text-xs opacity-80">Set your price</div>
        </div>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'

defineProps<{
  orderType: 'market' | 'limit'
}>()
defineEmits(['set-order-type'])
</script>
