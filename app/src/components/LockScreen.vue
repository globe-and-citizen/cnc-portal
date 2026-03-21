<template>
  <div class="flex min-h-screen flex-col items-center justify-center bg-gray-50 text-center">
    <div class="max-w-md rounded-2xl bg-white p-6 shadow-lg">
      <h1 class="mb-3 text-2xl font-bold text-red-500">🔒 Session Locked</h1>
      <p class="mb-4 text-gray-600">
        You are authenticated with this address
        <span class="font-mono text-sm"> {{ formatedUserAddress }} </span> but you have this address
        connected <span class="font-mono text-sm">{{ formatedConnectedAddress }}</span
        >.
      </p>
      <p class="mb-6 text-sm text-gray-500">
        Logout and login back.<br />
        <span class="font-medium text-blue-600">Waiting for unlock...</span>
      </p>
      <ButtonUI @click="disconnect.mutate()" variant="warning">Logout</ButtonUI>
    </div>

    <p class="mt-6 text-xs text-gray-400">Or switch you account back to address...</p>
  </div>
</template>

<script setup lang="ts">
import { useDisconnect, useConnection } from '@wagmi/vue'
import type { User } from '@/types'
import ButtonUI from './ButtonUI.vue'
import { computed } from 'vue'
import { formatAddress } from '@/utils/formatAddress'

const disconnect = useDisconnect()
const connection = useConnection()

const props = defineProps<{
  user: Pick<User, 'address'> & { role?: string }
}>()

const formatedUserAddress = computed(() => formatAddress(props.user.address))

const formatedConnectedAddress = computed(() =>
  connection.address.value ? formatAddress(connection.address.value) : 'Not connected'
)
</script>
