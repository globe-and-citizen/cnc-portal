<template>
  <div class="flex justify-end">
    <div class="flex justify-between">
      <div class="flex items-center space-x-2 sm:space-x-4">
        <UButton color="neutral" variant="ghost">
          <img src="../assets/Ethereum.png" class="h-4 sm:h-5 w-4 sm:w-5" alt="Ethereum Icon" />
          <span
            class="font-mono text-xs sm:text-sm hidden sm:inline-block"
            data-test="balance-with-symbol"
          >
            {{ NETWORK.currencySymbol }}
          </span>
        </UButton>

        <NotificationDropdown />

        <UDropdownMenu :items="profileItems" data-test="profile">
          <UAvatar
            :src="
              imageUrl ||
              'https://img.daisyui.com/images/stock/photo-1534528741775-53994a69daeb.webp'
            "
            alt="User avatar"
            size="sm"
          />
        </UDropdownMenu>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { NETWORK } from '@/constant/index'
import { useAuth } from '@/composables/useAuth'
import NotificationDropdown from '@/components/NotificationDropdown.vue'
import { useUserDataStore } from '@/stores'
import { storeToRefs } from 'pinia'
import type { DropdownMenuItem } from '@nuxt/ui'

defineEmits(['toggleSideButton', 'toggleEditUserModal'])
const { logout } = useAuth()
const userStore = useUserDataStore()
const { imageUrl } = storeToRefs(userStore)

const profileItems = <DropdownMenuItem[]>[
  { label: 'Settings' },
  { label: 'Logout', onSelect: logout }
]
</script>
