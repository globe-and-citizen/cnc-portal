<template>
  <div class="flex justify-end">
    <div class="flex justify-between">
      <div class="flex items-center space-x-2 sm:space-x-4">
        <div class="dropdown dropdown-end">
          <div
            tabindex="0"
            role="button"
            class="btn btn-ghost sm:btn-sm bg-opacity-10 hover:bg-opacity-20 transform text-black transition-all duration-300 ease-in-out hover:scale-105"
          >
            <div class="flex items-center justify-center space-x-1 sm:space-x-2">
              <img src="../assets/Ethereum.png" class="h-4 w-4 sm:h-5 sm:w-5" alt="Ethereum Icon" />
              <div
                class="hidden font-mono text-xs sm:inline-block sm:text-sm"
                data-test="balance-with-symbol"
              >
                {{ NETWORK.currencySymbol }}
              </div>
            </div>
          </div>
        </div>

        <NotificationDropdown />

        <div class="dropdown dropdown-end" data-test="profile">
          <div tabindex="0" role="button" class="btn btn-ghost btn-circle avatar">
            <div class="ring-opacity-30 w-8 rounded-full ring-3 ring-white ring-offset-2 sm:w-10">
              <img
                alt="User avatar"
                :src="
                  imageUrl ||
                  'https://img.daisyui.com/images/stock/photo-1534528741775-53994a69daeb.webp'
                "
                class="transform transition duration-300 ease-in-out hover:scale-110"
              />
            </div>
          </div>
          <ul
            tabindex="0"
            class="menu menu-sm dropdown-content rounded-box z-1 mt-3 w-40 p-2 shadow-lg sm:w-52"
          >
            <!-- <li>
              <a
                @click="emits('toggleEditUserModal')"
                data-test="toggleEditUser"
                class="hover:bg-opacity-10 transition-all duration-300 justify-between text-sm sm:text-base"
              >
                Profile
                <span class="badge badge-sm bg-green-500">New</span>
              </a>
            </li> -->
            <li>
              <a class="hover:bg-opacity-10 text-sm transition-all duration-300 sm:text-base">
                Settings
              </a>
            </li>
            <li>
              <a
                data-test="logout"
                @click="logout()"
                class="hover:bg-opacity-10 text-sm transition-all duration-300 sm:text-base"
              >
                Logout
              </a>
            </li>
          </ul>
        </div>
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

defineEmits(['toggleSideButton', 'toggleEditUserModal'])
const { logout } = useAuth()
const userStore = useUserDataStore()
const { imageUrl } = storeToRefs(userStore)

// defineProps<{
//   isCollapsed: boolean
// }>()
</script>

<style scoped>
.dropdown-content {
  backdrop-filter: blur(8px);
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.dropdown-content {
  animation: fadeIn 0.2s ease-out;
}
</style>
