<template>
  <div
    class="flex transition-all duration-300"
    :class="{
      'flex-row justify-start gap-4': layout === 'default',
      'justify-center flex-col items-center': isCollapsed || isDetailedView,
      'flex-col': layout === 'alternate'
    }"
  >
    <!-- Image and Name Row -->
    <div class="flex flex-row items-center gap-3">
      <div role="button" class="relative group">
        <div
          class="relative rounded-full overflow-hidden"
          :class="{
            'ring-gray-200 w-24 h-24 ring-4': isDetailedView,
            'w-11 h-11 ring-2 ring-white/50': !isDetailedView && layout === 'default',
            'w-16 h-16': layout === 'alternate' && !isDetailedView
          }"
        >
          <img
            alt="User Avatar"
            :src="user.imageUrl || defaultAvatar"
            class="w-full h-full object-cover"
          />
        </div>
      </div>
      <p
        v-if="!isCollapsed && layout === 'alternate'"
        class="font-bold text-xl"
        data-test="user-name"
      >
        {{ user.name || 'User' }}
      </p>
    </div>

    <!-- Role and Address Section (only for alternate layout) -->
    <div
      v-if="!isCollapsed && layout === 'alternate'"
      class="mt-6 ml-19"
    >
      <p
        v-if="user.role"
        class="text-gray-600 text-lg"
        data-test="user-role"
      >
        {{ user.role }}
      </p>
      <p
        class="text-gray-400 text-sm mt-1"
        data-test="formatted-address"
      >
        {{ formatedUserAddress }}
      </p>
    </div>

    <!-- Default Layout Content -->
    <div
      v-if="!isCollapsed && layout !== 'alternate'"
      class="flex text-gray-600"
      :class="{
        'flex-col items-center text-center': isDetailedView,
        'flex-col': layout === 'default' && !isDetailedView
      }"
    >
      <p
        class="font-bold line-clamp-1"
        :class="{
          'text-lg': isDetailedView,
          'text-sm': !isDetailedView
        }"
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
  layout?: 'default' | 'alternate'
}>()

const defaultAvatar = 'https://img.daisyui.com/images/stock/photo-1534528741775-53994a69daeb.webp'

const formatedUserAddress = computed(() => {
  return props.user.address
    ? props.user.address.substring(0, 6) +
        '...' +
        props.user.address.substring(props.user.address.length - 4)
    : ''
})
</script>
