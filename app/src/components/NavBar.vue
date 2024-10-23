<template>
  <!-- <header> -->
  <div class="navbar bg-base-100 fixed z-50 shadow-sm p-5">
    <div class="navbar-start">
      <div>
        <img src="../assets/Logo.png" alt="Logo" />
      </div>
      <div class="">
        <button
          class="btn btn-square btn-ghost drawer-overlay"
          @click="emits('toggleSideButton')"
          data-test="toggleSideButton"
        >
          <Bars3Icon class="size-6" />
        </button>
      </div>
    </div>
    <div class="navbar-end gap-2">
      <!--Withdraw Start-->
      <div class="dropdown w-48 rounded-full">
        <div tabindex="0" role="button" class="">
          <div class="btn w-full flex flex-row justify-between bg-base-primary">
            <img src="../assets/Ethereum.png" height="20" width="20" alt="Ethereum Icon" />
            <div class="text-xs flex" v-if="balanceLoading">
              <span class="loading loading-dots loading-xs" data-test="balance-loading"></span>
              <span>{{ NETWORK.currencySymbol }}</span>
            </div>
            <div v-else>
              <span class="text-black font-bold font-mono"> {{ balance.slice(0, 5) }}</span>
              <span class="ml-2 text-black font-bold font-mono text-xs">{{
                NETWORK.currencySymbol
              }}</span>
            </div>
          </div>
        </div>
        <ul
          tabindex="0"
          class="mt-3 dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-48"
        >
          <li v-if="withdrawLoading" data-test="withdraw-loading">
            <a href="#"> Processing <span class="loading loading-dots loading-xs"></span> </a>
          </li>
          <li v-else><a @click="emits('withdraw')" data-test="withdraw">Withdraw Tips</a></li>
        </ul>
      </div>
      <!--Withdraw End-->
      <NotificationDropdown />
      <div class="dropdown dropdown-end">
        <div tabindex="0" role="button" class="avatar">
          <div class="w-10 rounded-full flex justify-center">
            <img
              alt="Tailwind CSS Navbar component"
              src="https://img.daisyui.com/images/stock/photo-1534528741775-53994a69daeb.webp"
            />
          </div>
        </div>
        <ul
          tabindex="0"
          class="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-100 rounded-box w-52"
        >
          <li>
            <a
              class="justify-between"
              @click="emits('toggleEditUserModal')"
              data-test="toggleEditUser"
            >
              Profile
              <span class="badge">New</span>
            </a>
          </li>
          <li><a>Settings</a></li>
          <li>
            <a
              @click="
                () => {
                  disconnect()
                  logout()
                }
              "
              >Logout</a
            >
          </li>
        </ul>
      </div>
    </div>
  </div>
  <!-- </header> -->
</template>

<script setup lang="ts">
import { NETWORK } from '@/constant/index'
import { useAuth } from '@/composables/useAuth'
import { Bars3Icon } from '@heroicons/vue/24/solid'
import NotificationDropdown from '@/components/NotificationDropdown.vue'
import { useDisconnect } from '@wagmi/vue'

const emits = defineEmits(['toggleSideButton', 'toggleEditUserModal', 'withdraw'])
const { logout } = useAuth()
const { disconnect } = useDisconnect()

defineProps<{
  withdrawLoading: boolean
  balanceLoading: boolean
  balance: string
}>()
</script>

<style scoped></style>
