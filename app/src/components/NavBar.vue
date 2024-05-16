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
            <div v-if="balanceLoading">XXX ETH</div>
            <div v-else>
              <span class="text-black font-bold font-mono"> {{ balance.slice(0, 6) }}</span>
              <span class="ml-2 text-black font-bold font-mono">ETH</span>
            </div>
          </div>
        </div>
        <ul
          tabindex="0"
          class="mt-3 dropdown-content z-[1] menu p-2 shadow bg-white rounded-box w-48"
        >
          <li v-if="withdrawLoading"><a href="#">Processing...</a></li>
          <li v-else><a @click="$emit('withdraw')">Withdraw Tips</a></li>
        </ul>
      </div>

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
            <a class="justify-between" @click="$emit('toggleEditUserModal')">
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
import { logout } from '@/utils/navBarUtil'
import IconHamburgerMenu from '@/components/icons/IconHamburgerMenu.vue'
import IconBell from '@/components/icons/IconBell.vue'
import { onMounted } from 'vue'

const emits = defineEmits(['toggleSideButton', 'toggleEditUserModal', 'withdraw', 'getBalance'])
defineProps<{
  withdrawLoading: boolean
  balanceLoading: boolean
  balance: string
}>()
onMounted(() => {
  emits('getBalance')
})
</script>

<style scoped></style>
