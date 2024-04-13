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
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
            />
          </svg>
          Dashboard</RouterLink
        >
      </li>
      <li>
        <RouterLink to="/teams">
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
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          Teams
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
