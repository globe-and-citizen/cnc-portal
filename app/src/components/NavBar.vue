<template>
  <div class="flex justify-end">
    <div class="flex justify-between">
      <div class="flex items-center space-x-2 sm:space-x-4">
        <UButton color="neutral" variant="ghost">
          <img src="../assets/Ethereum.png" class="h-4 w-4 sm:h-5 sm:w-5" alt="Ethereum Icon" />
          <span
            class="hidden font-mono text-xs sm:inline-block sm:text-sm"
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
    <div>
      <UModal
        v-model:open="open"
        title="Update User Data"
        description="Edit your profile information used across the application."
      >
        <template #body>
          <EditUserForm />
        </template>
      </UModal>
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
import EditUserForm from '@/components/forms/EditUserForm.vue'
import { ref } from 'vue'

defineEmits(['toggleSideButton', 'toggleEditUserModal'])
const { logout } = useAuth()
const userStore = useUserDataStore()
const { imageUrl } = storeToRefs(userStore)

const open = ref(false)

const profileItems = <DropdownMenuItem[]>[
  { label: 'Settings', onSelect: () => (open.value = true) },
  { label: 'Logout', onSelect: logout }
]
</script>
