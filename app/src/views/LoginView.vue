<template>
  <div class="min-h-screen flex flex-col lg:flex-row">
    <div
      class="grow flex flex-col items-center justify-center flex-auto p-6 lg:p-10 lg:w-2/3 bg-cover bg-center lg:bg-[url('/src/assets/overlay_2.png')]"
    >
      <transition appear name="fade" mode="out-in">
        <div class="text-center">
          <img
            src="../assets/Logo.png"
            alt="Logo"
            class="mb-6 mx-auto w-32 lg:w-48 animate-float"
          />
          <h1 class="mb-10 lg:mb-20 text-2xl lg:text-4xl font-bold">Hi, Welcome back</h1>
          <img
            src="../assets/login-illustration.png"
            alt="Login illustration"
            class="max-w-full h-auto animate-slide-up"
          />
        </div>
      </transition>
    </div>
    <div class="w-full lg:w-1/3 flex flex-col justify-center p-6 lg:p-10">
      <transition appear name="fade" mode="out-in">
        <div>
          <h2 class="pb-4 flex justify-center text-xl lg:text-2xl font-semibold text-gray-800">
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
            <div class="flex items-center">
              <div class="flex-grow h-px bg-gray-300"></div>
              <div class="px-4 text-gray-500 text-sm">OR</div>
              <div class="flex-grow h-px bg-gray-300"></div>
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
            </div>
          </div>
        </div>
      </transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import IconGoogle from '@/components/icons/IconGoogle.vue'
import IconFacebook from '@/components/icons/IconFacebook.vue'
import IconTwitter from '@/components/icons/IconTwitter.vue'
import { useSiwe } from '@/composables/useSiwe'
import ButtonUI from '@/components/ButtonUI.vue'

const { isProcessing, siwe } = useSiwe()
</script>
