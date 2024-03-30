<script setup lang="ts">
import { RouterView } from 'vue-router'
import NavBar from './components/NavBar.vue'
import { ref } from 'vue'
const toggleSide = ref(true)
function handleChange() {
  console.log('handleChange in App.vue')
  toggleSide.value = !toggleSide.value
}
</script>

<template>
  <div>
    <RouterView name="login" />

    <div class="container">
      <NavBar @toggleSideButton="handleChange" />
      <div class="content-wrapper">
        <div class="drawer lg:drawer-open">
          <input id="my-drawer-2" type="checkbox" class="drawer-toggle" />

          <div
            class="drawer-content flex flex-col"
            :style="{ marginLeft: toggleSide ? '325px' : '0' }"
          >
            <!-- Page content here -->
            <RouterView />
          </div>
          <div
            class="flex flex-col items-center menu p-4 w-80 min-h-full bg-white text-base-content fixed"
            v-show="toggleSide"
            @toggleSideButton="handleChange"
          >
            <div
              class="flex flex-row items-center justify-center card w-64 h-24 bg-base-100 shadow-xl"
            >
              <div
                tabindex="0"
                role="button"
                class="btn btn-ghost btn-circle avatar flex items-center"
              >
                <div class="rounded-full">
                  <img
                    src="https://daisyui.com/images/stock/photo-1534528741775-53994a69daeb.jpg"
                    alt="Shoes"
                  />
                </div>
              </div>
              <div class="flex flex-col pl-12">
                <!-- Added ml-4 for spacing -->
                <div class="font-semibold text-lg">Dasarath G</div>
                <div class="pt-2.5"></div>
                <div class="badge badge-primary">Admin</div>
              </div>
            </div>
            <div class="pt-10">
              <ul class="menu bg-white w-64 rounded-box">
                <li class="menu-item">
                  <a>
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
                    Dashboard
                  </a>
                </li>
                <li class="menu-item">
                  <a>
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
                    Renumeration
                  </a>
                </li>
                <li class="menu-item">
                  <a>
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
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                      />
                    </svg>
                    Cap Table
                  </a>
                </li>
                <li class="menu-item">
                  <a>
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
                    Reports
                  </a>
                </li>
                <li class="menu-item">
                  <a>
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
                    Policy
                  </a>
                </li>
                <li class="menu-item">
                  <a>
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
                    User Profile
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.container {
  position: relative;
  display: flex;
}
.menu-item {
  height: 5rem; /* Adjust the height as needed */
}

.menu-item:hover a {
  color: green; /* Font color on hover */
}

.content-wrapper {
  flex: 1;
  padding-top: 80px;
}
</style>
