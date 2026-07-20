<template>
  <div class="flex justify-end">
    <div class="flex justify-between">
      <div class="flex items-center space-x-2 sm:space-x-4">
        <UTooltip
          v-if="showContractVersion"
          :text="`Latest contract version deployed on ${NETWORK.networkName}`"
        >
          <UBadge color="neutral" variant="subtle" size="lg" data-test="contract-version-badge">
            <span class="hidden sm:inline">Contracts&nbsp;</span>{{ latestContractVersion }}
          </UBadge>
        </UTooltip>

        <UButton color="neutral" variant="ghost">
          <img src="../assets/Ethereum.png" class="h-4 w-4 sm:h-5 sm:w-5" alt="Ethereum Icon" />
          <span
            class="hidden font-mono text-xs sm:inline-block sm:text-sm"
            data-test="balance-with-symbol"
          >
            {{ NETWORK.currencySymbol }}
          </span>
        </UButton>

        <UColorModeButton data-test="color-mode-button" />

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
import { currentChainId, NETWORK } from '@/constant/index'
import { latestDeployedVersionForChain } from '@/artifacts/registry'
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
const showContractVersion = import.meta.env.DEV
const latestContractVersion = latestDeployedVersionForChain(currentChainId)

const profileItems = <DropdownMenuItem[]>[
  { label: 'Settings', onSelect: () => (open.value = true) },
  { label: 'Logout', onSelect: logout }
]
</script>
