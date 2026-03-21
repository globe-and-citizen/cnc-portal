<template>
  <div class="card w-full rounded-2xl py-6" :class="[bgColor, textColor]">
    <div class="flex flex-col items-center gap-4">
      <img :src="cardIcon" alt="icon" class="h-16 w-16" data-test="card-icon" />
      <span v-if="!loading" class="text-4xl font-bold" data-test="amount">{{ title }}</span>
      <SkeletonLoading v-else class="h-8 w-24 opacity-20" />
      <span class="text-sm font-semibold" data-test="subtitle">{{ subtitle }}</span>
      <slot></slot>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { computed } from 'vue'
import SkeletonLoading from './SkeletonLoading.vue'

const props = defineProps({
  title: {
    type: [String, Number],
    required: true
  },
  subtitle: {
    type: String,
    required: true
  },
  variant: {
    type: String,
    default: 'primary'
  },
  cardIcon: {
    type: String,
    default: ''
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const bgColor = computed(() => {
  switch (props.variant) {
    case 'info':
      return 'bg-[#D9F1F6]'
    case 'success':
      return 'bg-[#C8FACD]'
    case 'warning':
      return 'bg-[#FEF3DE]'
    default:
      return 'bg-white'
  }
})

const textColor = computed(() => {
  switch (props.variant) {
    case 'info':
      return 'text-[#0C315A]'
    case 'success':
      return 'text-[#005249]'
    case 'warning':
      return 'text-[#6A3B13]'
    default:
      return 'text-black'
  }
})
</script>
