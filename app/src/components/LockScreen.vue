<template>
  <div class="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-center">
    <div class="max-w-md p-6 bg-white rounded-2xl shadow-lg">
      <h1 class="text-2xl font-bold text-red-500 mb-3">🔒 Session Locked</h1>
      <p class="text-gray-600 mb-4">
        You are authenticated with this address {{ formatedUserAddress }}... But you have this
        address connected {{ formatedConnectedAddress }}.
      </p>
      <p class="text-sm text-gray-500 mb-6">
        Logout and login back.<br />
        <span class="text-blue-600 font-medium">Waiting for unlock...</span>
      </p>
      <ButtonUI @click="disconnect()">Logout</ButtonUI>
    </div>

    <p class="mt-6 text-xs text-gray-400">Or switch you account back to address...</p>
  </div>
</template>

<script setup lang="ts">
import { useDisconnect, useAccount } from '@wagmi/vue'
import type { User } from '@/types'
import ButtonUI from './ButtonUI.vue'
import { computed } from 'vue'

const { disconnect } = useDisconnect()

const { address: connectedAddress } = useAccount()

const props = defineProps<{
  user: Pick<User, 'address'> & { role?: string }
}>()

const formatedUserAddress = computed(() => {
  return props.user.address
    ? props.user.address.slice(0, 6) +
        '...' +
        props.user.address.slice(props.user.address.length - 4)
    : ''
})

const formatedConnectedAddress = computed(() => {
  return connectedAddress?.value
    ? connectedAddress.value.slice(0, 6) +
        '...' +
        connectedAddress.value.slice(connectedAddress.value.length - 4)
    : ''
})
</script>
