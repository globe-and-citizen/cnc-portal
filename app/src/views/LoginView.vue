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
            <UButton
              data-testid="sign-in"
              color="primary"
              size="xl"
              class="w-full justify-center"
              @click="siwe()"
              :disabled="isProcessing"
              :label="isProcessing ? 'Processing...' : 'Sign In With Ethereum'"
            />
          </div>
        </div>
      </transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useSiwe } from '@/composables/useSiwe'

const { isProcessing, siwe } = useSiwe()
</script>
