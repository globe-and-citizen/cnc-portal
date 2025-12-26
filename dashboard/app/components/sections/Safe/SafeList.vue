<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-semibold">My Safes</h3>
        <div class="flex items-center gap-2">
          <UInput
            v-model="search"
            placeholder="Search address or network..."
            size="sm"
            class="w-56"
            icon="i-heroicons-magnifying-glass"
          />
          <UButton icon="i-heroicons-arrow-path" @click="fetchSafes" :loading="isLoading" size="xs">Refresh</UButton>
        </div>
      </div>
    </template>
    <div class="overflow-x-auto">
      <table class="w-full">
        <thead>
          <tr class="border-b border-gray-200 dark:border-gray-700">
            <th class="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">#</th>
            <th class="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Safe Address</th>
            <th class="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Network</th>
            <th class="text-right py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Balance</th>
            <th class="text-right py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Symbol</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="isLoading">
            <td colspan="5" class="text-center py-8">
              <UIcon name="i-heroicons-arrow-path" class="w-6 h-6 animate-spin inline-block" />
            </td>
          </tr>
          <tr
            v-for="(safe, idx) in filteredSafes"
            :key="safe.address"
            class="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <td class="px-4 py-4 text-sm text-gray-500">{{ idx + 1 }}</td>
            <td class="px-4 py-4 text-sm font-mono truncate flex items-center gap-2">
              <span>{{ safe.address }}</span>
              <UButton
                icon="i-heroicons-clipboard"
                size="xs"
                color="neutral"
                variant="ghost"
                title="Copy address"
                @click="copyAddress(safe.address)"
              />
            </td>
            <td class="px-4 py-4 text-sm text-left text-gray-500 dark:text-gray-400">{{ safe.chain }}</td>
            <td class="px-4 py-4 text-sm text-right font-semibold">{{ safe.balance }}</td>
            <td class="px-4 py-4 text-sm text-right font-medium">{{ safe.symbol }}</td>
          </tr>
          <tr v-if="!isLoading && filteredSafes.length === 0">
            <td colspan="5" class="text-center py-8 text-gray-500">
              No safes found for your account.
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </UCard>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useConnection } from '@wagmi/vue'
import { useSafes } from '@/composables/Safe/read'
import { useToast } from '#imports'

const connection = useConnection()
const { safes, isLoading, fetchSafes } = useSafes(connection.address)
const search = ref('')
const toast = useToast()

const filteredSafes = computed(() => {
  if (!search.value) return safes.value
  const q = search.value.toLowerCase()
  return safes.value.filter(
    safe =>
      safe.address.toLowerCase().includes(q) ||
      safe.chain.toLowerCase().includes(q) ||
      (safe.symbol && safe.symbol.toLowerCase().includes(q))
  )
})

function copyAddress(address: string) {
  navigator.clipboard.writeText(address)
  toast.add({ title: 'Copied!', description: 'Safe address copied to clipboard.', color: 'success' })
}

onMounted(() => {
  if (connection.address.value) fetchSafes()
})

watch(() => connection.address.value, (newAddress, oldAddress) => {
  if (newAddress && newAddress !== oldAddress) {
    fetchSafes()
  }
})
</script>
