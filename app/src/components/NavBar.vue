<template>
  <!-- <header> -->
  <div class="navbar bg-white fixed z-50 shadow-sm p-5">
    <div class="navbar-start">
      <div>
        <img src="../assets/Logo.png" alt="Logo" />
      </div>
      <div class="">
        <button class="btn btn-square btn-ghost drawer-overlay" @click="$emit('toggleSideButton')">
          <IconHamburgerMenu />
        </button>
      </div>
    </div>
    <div class="navbar-end gap-2">
      <div class="dropdown w-48 rounded-full">
        <div tabindex="0" role="button" class="">
          <div class="btn w-full flex flex-row justify-between text-gray-500">
            <img src="../assets/Ethereum.png" height="20" width="20" alt="Ethereum Icon" />
            <div>
              <span class="text-black font-bold font-mono">{{ balance.slice(0, 6) }}</span>
              <span class="ml-2 text-black font-bold font-mono">ETH</span>
            </div>
          </div>
        </div>
        <ul
          tabindex="0"
          class="mt-3 dropdown-content z-[1] menu p-2 shadow bg-white rounded-box w-48"
        >
          <li><a @click="tipsStore.withdrawTips()">Withdraw Tips</a></li>
        </ul>
      </div>
      <label className="flex cursor-pointer gap-2">
        <svg
          v-if="isDark"
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="5" />
          <path
            d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"
          />
        </svg>
        <svg
          v-else
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
        </svg>
        <input
          type="checkbox"
          :value="isDark ? 'light' : 'dark'"
          @change="$emit('toggleTheme')"
          className="toggle theme-controller"
        />
      </label>
      <button class="btn btn-ghost btn-circle">
        <div class="indicator">
          <IconBell />
          <span class="badge badge-xs badge-primary indicator-item"></span>
        </div>
      </button>
      <div class="dropdown dropdown-end">
        <div tabindex="0" role="button" class="avatar">
          <div class="w-10 rounded-full flex justify-center">
            <img
              alt="Tailwind CSS Navbar component"
              src="https://img.daisyui.com/images/stock/photo-1534528741775-53994a69daeb.jpg"
            />
          </div>
        </div>
        <ul
          tabindex="0"
          class="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-white rounded-box w-52"
        >
          <li>
            <a class="justify-between" @click="emits('toggleEditUserModal')">
              Profile
              <span class="badge">New</span>
            </a>
          </li>
          <li><a>Settings</a></li>
          <li><a @click="logout()">Logout</a></li>
        </ul>
      </div>
    </div>
  </div>
  <!-- </header> -->
</template>
<script setup lang="ts">
import { useTipsStore } from '@/stores/tips'
import { storeToRefs } from 'pinia'
import { onMounted } from 'vue'
import { logout } from '@/utils/navBarUtil'
import IconHamburgerMenu from '@/components/icons/IconHamburgerMenu.vue'
import IconBell from '@/components/icons/IconBell.vue'
import { ref } from 'vue'

const props = defineProps(['isDark'])
const emits = defineEmits(['toggleSideButton', 'toggleEditUserModal', 'toggleTheme'])
const tipsStore = useTipsStore()
const { balance } = storeToRefs(tipsStore)

onMounted(async () => {
  await tipsStore.getBalance()
})
</script>

<style scoped></style>
