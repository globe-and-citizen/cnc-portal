<template>
  <div class="min-h-screen flex">
    <div class="grow flex flex-col items-center justify-center flex-auto auth p-10">
      <img src="../assets/Logo.png" alt="Logo" class="mb-6" />
      <h1 class="mb-20">Hi, Welcome back</h1>
      <img src="../assets/login-illustration.png" alt="Login illustration" />
    </div>
    <div class="w-[240px] grow flex flex-col justify-center p-10">
      <h2 class="pb-4 flex justify-center">Sign in to CNC portal</h2>
      <div class="flex flex-col gap-5">
        <button class="btn btn-primary w-full" @click="siwe" :disabled="isProcessing">
          <span v-if="isProcessing">Processing...</span>
          <span v-else>Sign In With Ethereum</span>
        </button>
        <div class="flex justify-center items-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="157"
            height="22"
            viewBox="0 0 157 22"
            fill="none"
          >
            <path
              d="M0 10.5H156"
              stroke="#919EAB"
              stroke-opacity="0.24"
              stroke-linecap="square"
              stroke-dasharray="2 3"
            />
          </svg>
          <p class="p-2">OR</p>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="157"
            height="22"
            viewBox="0 0 157 22"
            fill="none"
          >
            <path
              d="M0 10.5H156"
              stroke="#919EAB"
              stroke-opacity="0.24"
              stroke-linecap="square"
              stroke-dasharray="2 3"
            />
          </svg>
        </div>
        <div class="flex justify-center gap-[8px]">
          <IconGoogle />
          <IconFacebook />
          <IconTwitter />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import IconGoogle from '@/components/icons/IconGoogle.vue'
import IconFacebook from '@/components/icons/IconFacebook.vue'
import IconTwitter from '@/components/icons/IconTwitter.vue'
import { useSiwe } from '@/composables/useSiwe'
const { isProcessing, siwe } = useSiwe()
</script>

<style scoped>
.auth {
  background-image: url('/src/assets/overlay_2.png');
  background-size: cover;
}
</style>
