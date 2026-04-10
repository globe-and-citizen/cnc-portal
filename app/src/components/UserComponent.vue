<template>
  <div
    class="flex flex-row justify-start gap-4 transition-all duration-300"
    :class="{ 'flex-col items-center justify-center': isCollapsed || isDetailedView }"
  >
    <div role="button" class="group relative">
      <div
        data-test="avatar-container"
        class="relative overflow-hidden rounded-full"
        :class="{
          'h-24 w-24 ring-4 ring-gray-200': isDetailedView,
          'h-11 w-11 ring-2 ring-white/50': !isDetailedView
        }"
      >
        <img
          data-test="avatar-image"
          :alt="`${user.name ?? 'Unknown'}'s avatar`"
          :src="
            user.imageUrl ||
            'https://img.daisyui.com/images/stock/photo-1534528741775-53994a69daeb.webp'
          "
          class="h-full w-full object-cover"
        />
      </div>
    </div>
    <div v-if="!isCollapsed" data-test="user-info-container" class="flex flex-col text-gray-600">
      <p
        class="font-bold"
        :class="{ 'text-lg': isDetailedView, 'text-sm': !isDetailedView }"
        data-test="user-name"
      >
        {{
          props.user.name && props.user.name.length > 20
            ? `${props.user.name.slice(0, 20)}...`
            : props.user.name || 'User'
        }}
      </p>
      <p
        v-if="isDetailedView"
        class="mt-2 font-bold text-gray-400"
        :class="{ 'text-sm': isDetailedView, 'text-xs': !isDetailedView }"
        data-test="user-role"
      >
        {{ user.role || 'Member' }}
      </p>
      <p class="text-sm" data-test="formatted-address">
        {{ isDetailedView ? user.address : formatedUserAddress }}
      </p>
    </div>
  </div>
</template>

<script lang="ts" setup>
import type { User } from '@/types'
import { computed } from 'vue'
import { formatAddress } from '@/utils/formatAddress'

const props = defineProps<{
  user: Pick<User, 'address' | 'name' | 'imageUrl'> & { role?: string }
  isCollapsed?: boolean
  isDetailedView?: boolean
}>()

const formatedUserAddress = computed(() => formatAddress(props.user.address))
</script>
