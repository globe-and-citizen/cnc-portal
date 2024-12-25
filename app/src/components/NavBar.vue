<template>
  <nav class="flex justify-end border-0 border-b-2 border-slate-100 bg-white">
    <div class="flex justify-between py-3 px-3">
      <div class="flex items-center space-x-2 sm:space-x-4">
        <div class="dropdown dropdown-end">
          <div
            tabindex="0"
            role="button"
            class="btn btn-ghost sm:btn-sm bg-opacity-10 text-black hover:bg-opacity-20 transition-all duration-300 ease-in-out transform hover:scale-105"
          >
            <div class="flex items-center justify-center space-x-1 sm:space-x-2">
              <img src="../assets/Ethereum.png" class="h-4 sm:h-5 w-4 sm:w-5" alt="Ethereum Icon" />
              <div v-if="balanceLoading" class="flex items-center" data-test="balance-loading">
                <span class="loading loading-spinner loading-xs text-green-400"></span>
              </div>
              <div
                v-else
                class="font-mono text-xs sm:text-sm hidden sm:inline-block"
                data-test="balance-with-symbol"
              >
                {{ balance?.slice(0, 5) }} {{ NETWORK.currencySymbol }}
              </div>
            </div>
          </div>
          <ul
            tabindex="0"
            class="dropdown-content z-[1] menu p-2 shadow-lg rounded-box w-40 sm:w-52 mt-2"
          >
            <li v-if="withdrawLoading" data-test="withdraw-loading">
              <a
                class="bg-opacity-10 hover:bg-opacity-20 transition-all duration-300 text-sm sm:text-base"
              >
                Processing <span class="loading loading-dots loading-xs"></span>
              </a>
            </li>
            <li v-else>
              <a
                @click="emits('withdraw')"
                data-test="withdraw"
                class="bg-opacity-10 hover:bg-opacity-20 transition-all duration-300 text-sm sm:text-base"
              >
                Withdraw Tips
              </a>
            </li>
          </ul>
        </div>

        <NotificationDropdown />

        <div class="dropdown dropdown-end">
          <div tabindex="0" role="button" class="btn btn-ghost btn-circle avatar">
            <div class="w-8 sm:w-10 rounded-full ring ring-white ring-opacity-30 ring-offset-2">
              <img
                alt="User avatar"
                src="https://img.daisyui.com/images/stock/photo-1534528741775-53994a69daeb.webp"
                class="transform transition duration-300 ease-in-out hover:scale-110"
              />
            </div>
          </div>
          <ul
            tabindex="0"
            class="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow-lg rounded-box w-40 sm:w-52"
          >
            <li>
              <a
                @click="emits('toggleEditUserModal')"
                data-test="toggleEditUser"
                class="hover:bg-opacity-10 transition-all duration-300 justify-between text-sm sm:text-base"
              >
                Profile
                <span class="badge badge-sm bg-green-500">New</span>
              </a>
            </li>
            <li>
              <a class="hover:bg-opacity-10 transition-all duration-300 text-sm sm:text-base">
                Settings
              </a>
            </li>
            <li>
              <a
                @click="logout()"
                class="hover:bg-opacity-10 transition-all duration-300 text-sm sm:text-base"
              >
                Logout
              </a>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { NETWORK } from '@/constant/index'
import { useAuth } from '@/composables/useAuth'
import NotificationDropdown from '@/components/NotificationDropdown.vue'

const emits = defineEmits(['toggleSideButton', 'toggleEditUserModal', 'withdraw'])
const { logout } = useAuth()

defineProps<{
  withdrawLoading: boolean
  balanceLoading: boolean
  balance: string
  isCollapsed: boolean
}>()
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
