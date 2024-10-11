<template>
  <div
    class="flex flex-col bg-base-100 items-center menu pt-28 w-80 min-h-full text-base-content fixed px-6 gap-3"
  >
    <div
      class="w-full flex flex-row justify-start gap-4 card bg-base-200 px-5 py-4 cursor-pointer"
      @click="emits('openEditUserModal')"
    >
      <div tabindex="0" role="button" class="btn btn-ghost btn-circle avatar flex items-center">
        <div class="rounded-full">
          <img
            alt="Tailwind CSS Navbar component"
            src="https://img.daisyui.com/images/stock/photo-1534528741775-53994a69daeb.webp"
            class="w-[44px]"
          />
        </div>
      </div>
      <div class="flex flex-col">
        <p class="font-semibold text-lg">{{ user.name ? user.name : 'User' }}</p>
        <div class="flex flex-col"></div>
        <p class="text-slate-500">
          {{ formatedUserAddress }}
        </p>
      </div>
    </div>
    <ul class="menu bg-base-100 w-full rounded-box gap-3">
      <li class="menu-title">Title</li>
      <li>
        <RouterLink to="/">
          <HomeIcon class="size-6" />
          Dashboard</RouterLink
        >
      </li>
      <li>
        <RouterLink to="/teams">
          <UsersIcon class="size-6" />
          Teams
        </RouterLink>
      </li>
      <li>
        <RouterLink to="/transactions">
          <ClipboardDocumentListIcon class="size-6" />
          Transactions
        </RouterLink>
      </li>
    </ul>
  </div>
</template>

<style scoped lang="scss">
li {
  > a {
    @apply py-3;
  }
}
</style>

<script setup lang="ts">
import { HomeIcon, UsersIcon, ClipboardDocumentListIcon } from '@heroicons/vue/24/outline'
import { computed } from 'vue'

interface User {
  name: string
  address: string
}
// Explicitly define the props with correct types
const emits = defineEmits(['openEditUserModal'])
const props = defineProps<{
  user: User
}>()

const formatedUserAddress = computed(() => {
  return props.user.address
    ? props.user.address.substring(0, 10) +
        '...' +
        props.user.address.substring(props.user.address.length - 10)
    : ''
})
</script>
