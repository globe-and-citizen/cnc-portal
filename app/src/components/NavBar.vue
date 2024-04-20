<template>
  <!-- <header> -->
  <div class="navbar bg-white fixed z-50 shadow-sm p-5">
    <div class="navbar-start">
      <div>
        <img src="../assets/Logo.png" alt="Logo" />
      </div>
      <div class="">
        <button class="btn btn-square btn-ghost drawer-overlay" @click="$emit('toggleSideButton')">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 28 28"
            class="inline-block w-7 h-7 stroke-current"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 6h16M4 12h16M4 18h16"
            ></path>
          </svg>
        </button>
      </div>
    </div>
    <div class="navbar-end gap-2">
      <div class="dropdown w-48 rounded-full">
        <div tabindex="0" role="button" class="">
          <div class="btn w-full flex flex-row justify-between text-gray-500">
            <img src="../assets/Ethereum.png" height="20" width="20" alt="Ethereum Icon" />
            <div>
              <span class="text-black font-bold font-mono">{{ balance }}</span>
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

      <button class="btn btn-ghost btn-circle">
        <div class="indicator">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
          <span class="badge badge-xs badge-primary indicator-item"></span>
        </div>
      </button>
      <div class="dropdown dropdown-end">
        <div tabindex="0" role="button" class="avatar">
          <div class="w-10 rounded-full flex justify-center">
            <img
              alt="Tailwind CSS Navbar component"
              src="https://daisyui.com/images/stock/photo-1534528741775-53994a69daeb.jpg"
            />
          </div>
        </div>
        <ul
          tabindex="0"
          class="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-white rounded-box w-52"
        >
          <li>
            <a class="justify-between">
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
import { defineEmits, onMounted } from 'vue'
import { logout } from '@/utils/navBarUtil'

defineEmits(['toggleSideButton'])
const tipsStore = useTipsStore()
const { balance } = storeToRefs(tipsStore)

onMounted(async () => {
  let test = await tipsStore.getBalance()
  console.log(test)
})
</script>

<style scoped></style>
