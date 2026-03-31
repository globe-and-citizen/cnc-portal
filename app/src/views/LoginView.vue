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
