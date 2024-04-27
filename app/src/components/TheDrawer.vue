<template>
  <div
    class="flex flex-col items-center menu pt-28 w-80 min-h-full bg-white text-base-content fixed px-6 gap-3"
  >
    <div class="w-full flex flex-row justify-start gap-4 card bg-base-100 px-5 py-4">
      <div tabindex="0" role="button" class="btn btn-ghost btn-circle avatar flex items-center">
        <div class="rounded-full">
          <img
            src="https://daisyui.com/images/stock/photo-1534528741775-53994a69daeb.jpg"
            alt="Shoes"
            class="w-[44px]"
          />
        </div>
      </div>
      <div class="flex flex-col">
        <p class="font-semibold text-lg">Dasarath G</p>
        <p class="text-slate-500">Admin</p>
      </div>
    </div>
    <ul class="menu bg-white w-full rounded-box gap-3">
      <li class="menu-title">Title</li>
      <li>
        <RouterLink to="/">
          <IconHome />
          Dashboard</RouterLink
        >
      </li>
      <li>
        <RouterLink to="/teams">
          <IconUsers />
          Teams
        </RouterLink>
      </li>
      <li>
        <RouterLink to="/transactions">
          <IconNote />
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
import IconHome from '@/components/icons/IconHome.vue'
import IconUsers from '@/components/icons/IconUsers.vue'
import IconNote from '@/components/icons/IconNote.vue'
</script>
