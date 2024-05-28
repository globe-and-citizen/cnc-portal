<template>
  <div class="min-h-screen flex">
    <div class="grow flex flex-col items-center justify-center flex-auto auth p-10">
      <img src="../assets/Logo.png" alt="Logo" class="mb-6" />
      <h1 class="mb-20">Hi, Welcome back</h1>
      <img src="../assets/login-illustration.png" alt="Login illustration" />
    </div>
    <div class="w-[240px] grow flex flex-col justify-center p-10">
      <h2 class="pb-4 flex justify-center">Sign in to CNC portal</h2>
      <!--<p class="pb-5">
        New User ? <span><a href="#" class="text-primary">Create an account</a></span>
      </p>-->
      <div class="flex flex-col gap-5">
        <!--<input type="text" placeholder="Email address" class="input input-bordered w-full" />

        <label class="input input-bordered flex items-center gap-2">
          <input type="password" class="grow" placeholder="Password" />
          <span class="p-2 cursor-pointer">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
            >
              <path
                d="M13.4999 12C13.4999 12.8284 12.8283 13.5 11.9999 13.5C11.1715 13.5 10.4999 12.8284 10.4999 12C10.4999 11.1716 11.1715 10.5 11.9999 10.5C12.8283 10.5 13.4999 11.1716 13.4999 12Z"
                fill="#637381"
              />
              <path
                fill-rule="evenodd"
                clip-rule="evenodd"
                d="M11.7299 5C17.7099 4.82 21.2299 10.39 21.8699 11.5C22.0485 11.8094 22.0485 12.1906 21.8699 12.5C21.0099 14 17.7999 18.86 12.2699 19H12.0199C6.12989 19 2.75989 13.59 2.12989 12.5C1.95125 12.1906 1.95125 11.8094 2.12989 11.5C2.99989 10 6.19988 5.14 11.7299 5ZM8.49989 12C8.49989 13.933 10.0669 15.5 11.9999 15.5C13.9329 15.5 15.4999 13.933 15.4999 12C15.4999 10.067 13.9329 8.5 11.9999 8.5C10.0669 8.5 8.49989 10.067 8.49989 12Z"
                fill="#637381"
              />
            </svg>
          </span>
        </label>

        <p class="text-right underline">Forgot password ?</p>-->
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
  <!--<NotificationToast v-if="showToast" :type="toastType" :message="toastMessage" />-->
</template>

<script setup lang="ts">
import IconGoogle from '@/components/icons/IconGoogle.vue'
import IconFacebook from '@/components/icons/IconFacebook.vue'
import IconTwitter from '@/components/icons/IconTwitter.vue'
//import NotificationToast from '@/components/NotificationToast.vue'
//import { useSiwe } from '@/composables/useSiwe'
import { useSiwe/*, useToast */} from "@/composables";

const { isProcessing, /*showToast, toastType, toastMessage, */siwe } = useSiwe()
</script>

<style scoped>
.auth {
  background-image: url('/src/assets/overlay_2.png');
  background-size: cover;
}
</style>
