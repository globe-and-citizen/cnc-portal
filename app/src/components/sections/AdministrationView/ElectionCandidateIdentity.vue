<template>
  <div
    class="flex transition-all duration-300"
    :class="{
      'flex-row justify-start gap-4': layout === 'default',
      'flex-col items-center justify-center': isCollapsed || isDetailedView,
      'flex-col': layout === 'alternate'
    }"
  >
    <!-- Image and Name Row -->
    <div class="flex flex-row items-center gap-3">
      <div role="button" class="group relative">
        <div
          class="relative overflow-hidden rounded-full"
          :class="{
            'h-24 w-24 ring-4 ring-gray-200': isDetailedView,
            'h-11 w-11 ring-2 ring-white/50': !isDetailedView && layout === 'default',
            'h-16 w-16': layout === 'alternate' && !isDetailedView
          }"
        >
          <img
            alt="User Avatar"
            :src="user.imageUrl || defaultAvatar"
            class="h-full w-full object-cover"
          />
        </div>
      </div>
      <p
        v-if="!isCollapsed && layout === 'alternate'"
        class="text-xl font-bold"
        data-test="user-name"
      >
        {{ user.name || 'User' }}
      </p>
    </div>

    <!-- Role and Address Section (only for alternate layout) -->
    <div v-if="!isCollapsed && layout === 'alternate'" class="mt-6 ml-19">
      <p v-if="user.role" class="text-lg text-gray-600" data-test="user-role">
        {{ user.role }}
      </p>
      <p class="mt-1 text-sm text-gray-400" data-test="formatted-address">
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
        class="line-clamp-1 font-bold"
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
        class="mt-2 font-bold text-gray-400"
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
import { formatAddress } from '@/utils/formatAddress'

const props = defineProps<{
  user: Pick<User, 'address' | 'name' | 'imageUrl'> & { role?: string }
  isCollapsed?: boolean
  isDetailedView?: boolean
  layout?: 'default' | 'alternate'
}>()

const defaultAvatar = 'https://img.daisyui.com/images/stock/photo-1534528741775-53994a69daeb.webp'

const formatedUserAddress = computed(() => formatAddress(props.user.address))
</script>
