<template>
  <div
    class="flex flex-row justify-start items-center gap-4 transition-all duration-300"
    :class="{ 'justify-center': isCollapsed || isDetailedView }"
  >
    <div role="button" class="relative group">
      <div
        data-test="avatar-container"
        class="relative rounded-full overflow-hidden border border-gray-400"
        :class="{
          'ring-gray-200 w-24 h-24 ring-4': isDetailedView,
          'w-11 h-11 ring-2 ring-white/50': !isDetailedView
        }"
      >
        <img
          data-test="avatar-image"
          alt="User Avatar"
          :src="user.imageUrl || defaultUser"
          class="w-full h-full object-cover"
        />
      </div>
    </div>
    <div
      v-if="!isCollapsed"
      data-test="user-info-container"
      class="flex-1 text-gray-800 flex items-center"
      :class="{ 'justify-center text-center flex-col': isDetailedView }"
    >
      <span class="text-gray-500 mr-2">Owner name:</span>
      <p
        class="font-bold line-clamp-1"
        :class="{ 'text-sm': isDetailedView, 'text-lg': !isDetailedView }"
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
    </div>
  </div>
</template>

<script lang="ts" setup>
import type { User } from '@/types'

defineProps<{
  user: Pick<User, 'address' | 'name' | 'imageUrl'> & { role?: string }
  isCollapsed?: boolean
  isDetailedView?: boolean
}>()

const defaultUser = 'https://img.daisyui.com/images/stock/photo-1534528741775-53994a69daeb.webp'
</script>
