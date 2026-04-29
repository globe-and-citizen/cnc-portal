<template>
  <div
    class="flex flex-row items-center justify-start gap-4 transition-all duration-300"
    :class="{ 'justify-center': isCollapsed || isDetailedView }"
  >
    <div role="button" class="group relative">
      <div
        data-test="avatar-container"
        :data-size="isDetailedView ? 'lg' : 'sm'"
        class="relative overflow-hidden rounded-full border border-gray-400"
        :class="{
          'h-24 w-24 ring-4 ring-gray-200': isDetailedView,
          'h-11 w-11 ring-2 ring-white/50': !isDetailedView
        }"
      >
        <img
          data-test="avatar-image"
          alt="User Avatar"
          :src="user.imageUrl || defaultUser"
          class="h-full w-full object-cover"
        />
      </div>
    </div>
    <div
      v-if="!isCollapsed"
      data-test="user-info-container"
      class="flex flex-1 items-center text-gray-800"
      :class="{ 'flex-col justify-center text-center': isDetailedView }"
    >
      <span class="mr-2 text-gray-500">Owner name:</span>
      <p
        class="line-clamp-1 font-bold"
        :class="{ 'text-sm': isDetailedView, 'text-lg': !isDetailedView }"
        data-test="user-name"
      >
        {{ user.name || 'User' }}
      </p>
      <p
        v-if="isDetailedView"
        class="mt-2 font-bold text-gray-400"
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
