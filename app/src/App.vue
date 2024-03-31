<script setup lang="ts">
import { RouterView } from 'vue-router'
import Drawer from '@/components/TheDrawer.vue'
import NavBar from '@/components/NavBar.vue'
import { ref } from 'vue'
const toggleSide = ref(true)
function handleChange() {
  toggleSide.value = !toggleSide.value
}
</script>

<template>
  <div>
    <RouterView name="login" />
    <div v-if="$route.path != '/login'">
      <NavBar @toggleSideButton="handleChange" />
      <div class="content-wrapper">
        <div class="drawer lg:drawer-open">
          <div
            class="drawer-content flex flex-col"
            :style="{ marginLeft: toggleSide ? '300px' : '0' }"
          >
            <div class="m-20">
              <RouterView />
            </div>
          </div>
          <div v-if="toggleSide" @toggleSideButton="handleChange">
            <Drawer />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped></style>
