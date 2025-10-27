<template>
  <div
    class="flex flex-row justify-start gap-4 transition-all duration-300"
    :class="{ 'justify-center flex-col items-center': isCollapsed || isDetailedView }"
  >
    <div role="button" class="relative group">
      <div
        data-test="avatar-container"
        class="relative rounded-full overflow-hidden"
        :class="{
          'ring-gray-200 w-24 h-24 ring-4': isDetailedView,
          'w-11 h-11 ring-2 ring-white/50': !isDetailedView
        }"
      >
        <img
          data-test="avatar-image"
          alt="User Avatar"
          :src="
            user.imageUrl ||
            'https://img.daisyui.com/images/stock/photo-1534528741775-53994a69daeb.webp'
          "
          class="w-full h-full object-cover"
        />
      </div>
    </div>
    <div
      v-if="!isCollapsed"
      data-test="user-info-container"
      class="flex flex-col text-gray-600"
      :class="{ 'items-center text-center': isDetailedView }"
    >
      <p
        class="font-bold line-clamp-1"
        :class="{ 'text-lg': isDetailedView, 'text-sm': !isDetailedView }"
        data-test="user-name"
      >
        {{ user.name || 'User' }}
      </p>
      <p
        v-if="isDetailedView"
        class="text-gray-400 font-bold mt-2"
        :class="{ 'text-sm': isDetailedView, 'text-xs': !isDetailedView }"
        data-test="user-role"
      >
        {{ user.role || 'Member' }}
      </p>
      <p class="text-sm" data-test="formatted-address">
        {{ formatedUserAddress }}
      </p>
    </div>
  </div>
</template>

<script lang="ts" setup>
import type { User } from '@/types'
import { computed } from 'vue'

const props = defineProps<{
  user: Pick<User, 'address' | 'name' | 'imageUrl'> & { role?: string }
  isCollapsed?: boolean
  isDetailedView?: boolean
}>()

const formatedUserAddress = computed(() => {
  return props.user.address
    ? props.user.address.substring(0, 6) +
        '...' +
        props.user.address.substring(props.user.address.length - 4)
    : ''
})
</script>
