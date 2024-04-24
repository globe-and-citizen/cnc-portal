<script setup lang="ts">
import { RouterView } from 'vue-router'
import Drawer from '@/components/TheDrawer.vue'
import NavBar from '@/components/NavBar.vue'
import NotificationToast from '@/components/NotificationToast.vue'
import { ref } from 'vue'
import { useToastStore } from './stores/toast'
import { storeToRefs } from 'pinia'

const toggleSide = ref(true)
function handleChange() {
  toggleSide.value = !toggleSide.value
}

const toastStore = useToastStore()
const { showToast, type: toastType, message: toastMessage } = storeToRefs(toastStore)
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
    <NotificationToast v-if="showToast" :type="toastType" :message="toastMessage" />
  </div>
</template>

<style scoped></style>
