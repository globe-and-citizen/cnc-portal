<template>
  <div class="flex min-h-screen flex-col lg:flex-row">
    <div
      class="flex flex-auto grow flex-col items-center justify-center bg-cover bg-center p-6 lg:w-2/3 lg:bg-[url('/src/assets/overlay_2.png')] lg:p-10"
    >
      <transition appear name="fade" mode="out-in">
        <div class="text-center">
          <img
            src="../assets/Logo.png"
            alt="Logo"
            class="animate-float mx-auto mb-6 w-32 lg:w-48"
          />
          <h1 class="mb-10 text-2xl font-bold lg:mb-20 lg:text-4xl">Hi, Welcome back</h1>
          <img
            src="../assets/login-illustration.png"
            alt="Login illustration"
            class="animate-slide-up h-auto max-w-full"
          />
        </div>
      </transition>
    </div>
    <div class="flex w-full flex-col justify-center p-6 lg:w-1/3 lg:p-10">
      <transition appear name="fade" mode="out-in">
        <div>
          <h2 class="flex justify-center pb-4 text-xl font-semibold text-gray-800 lg:text-2xl">
            Sign in to CNC portal
          </h2>
          <div class="flex flex-col gap-5">
            <ButtonUI
              data-testid="sign-in"
              variant="primary"
              class="w-full"
              @click="siwe()"
              :disabled="isProcessing"
            >
              <span v-if="isProcessing">Processing...</span>
              <span v-else>Sign In With Ethereum</span>
            </ButtonUI>
            <!-- <div class="flex items-center">
              <div class="grow h-px bg-gray-300"></div>
              <div class="px-4 text-gray-500 text-sm">OR</div>
              <div class="grow h-px bg-gray-300"></div>
            </div>
            <div class="flex justify-center gap-4">
              <transition-group name="social" tag="div" class="flex gap-4">
                <IconGoogle
                  key="google"
                  class="w-8 h-8 cursor-pointer transition-transform duration-300 ease-in-out hover:scale-110"
                />
                <IconFacebook
                  key="facebook"
                  class="w-8 h-8 cursor-pointer transition-transform duration-300 ease-in-out hover:scale-110"
                />
                <IconTwitter
                  key="twitter"
                  class="w-8 h-8 cursor-pointer transition-transform duration-300 ease-in-out hover:scale-110"
                />
              </transition-group>
            </div> -->
          </div>
        </div>
      </transition>
    </div>
  </div>
</template>

<script setup lang="ts">
// import IconGoogle from '@/components/icons/IconGoogle.vue'
// import IconFacebook from '@/components/icons/IconFacebook.vue'
// import IconTwitter from '@/components/icons/IconTwitter.vue'
import { useSiwe } from '@/composables/useSiwe'
import ButtonUI from '@/components/ButtonUI.vue'

const { isProcessing, siwe } = useSiwe()
</script>
