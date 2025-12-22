<template>
  <div class="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-center">
    <div class="max-w-md p-6 bg-white rounded-2xl shadow-lg">
      <h1 class="text-2xl font-bold text-red-500 mb-3">🔒 Session Locked</h1>
      <p class="text-gray-600 mb-4">
        You are authenticated with this address
        <span class="font-mono text-sm"> {{ formatedUserAddress }} </span> but you have this address
        connected <span class="font-mono text-sm">{{ formatedConnectedAddress }}</span
        >.
      </p>
      <p class="text-sm text-gray-500 mb-6">
        Logout and login back.<br />
        <span class="text-blue-600 font-medium">Waiting for unlock...</span>
      </p>
      <ButtonUI @click="disconnect.mutate()" variant="warning">Logout</ButtonUI>
    </div>

    <p class="mt-6 text-xs text-gray-400">Or switch you account back to address...</p>
  </div>
</template>

<script setup lang="ts">
import { useDisconnect, useConnection, useConnectionEffect } from '@wagmi/vue'
import type { User } from '@/types'
import ButtonUI from './ButtonUI.vue'
import { computed } from 'vue'

const disconnect = useDisconnect()
const connection = useConnection()

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
  return connection.address.value
    ? connection.address.value.slice(0, 6) +
        '...' +
        connection.address.value.slice(connection.address.value.length - 4)
    : ''
})

// Handle connection/disconnection lifecycle events
useConnectionEffect({
  onDisconnect() {
    console.log('Connection disconnected')
  }
})
</script>
