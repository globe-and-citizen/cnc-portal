<template>
  <div
    class="flex flex-row justify-start gap-4 transition-all duration-300"
    :class="{ 'justify-center flex-col items-center': isCollapsed || isDetailedView }"
  >
    <!-- Trading Icon for Trader Safe -->
    <div role="button" class="relative group">
      <div
        data-test="safe-icon-container"
        class="relative rounded-full overflow-hidden flex items-center justify-center"
        :class="{
          'bg-primary/10 w-24 h-24 ring-4 ring-primary/20': isDetailedView,
          'bg-primary/5 w-11 h-11 ring-2 ring-primary/10': !isDetailedView
        }"
      >
        <IconifyIcon
          data-test="safe-icon"
          icon="heroicons:arrow-trending-up"
          class="text-primary flex-shrink-0"
          :class="{ 'w-12 h-12': isDetailedView, 'w-6 h-6': !isDetailedView }"
        />
      </div>
    </div>

    <!-- Safe Information -->
    <div
      v-if="!isCollapsed"
      data-test="safe-info-container"
      class="flex flex-col text-gray-600"
      :class="{ 'items-center text-center': isDetailedView }"
    >
      <p
        class="font-bold line-clamp-1"
        :class="{ 'text-lg': isDetailedView, 'text-sm': !isDetailedView }"
        data-test="safe-name"
      >
        {{ safe.name || 'Trader Safe' }}
      </p>
      <p
        v-if="isDetailedView"
        class="text-gray-400 font-bold mt-2"
        :class="{ 'text-sm': isDetailedView, 'text-xs': !isDetailedView }"
        data-test="safe-label"
      >
        Multisig Wallet
      </p>
      <p class="text-sm" data-test="formatted-address">
        {{ formattedSafeAddress }}
      </p>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import { Icon as IconifyIcon } from '@iconify/vue'

interface TraderSafeInfo {
  name: string
  address: string
}

const props = defineProps<{
  safe: TraderSafeInfo
  isCollapsed?: boolean
  isDetailedView?: boolean
}>()

const formattedSafeAddress = computed(() => {
  return props.safe.address
    ? props.safe.address.substring(0, 6) +
        '...' +
        props.safe.address.substring(props.safe.address.length - 4)
    : ''
})
</script>
