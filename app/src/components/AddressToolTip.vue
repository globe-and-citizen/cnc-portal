<template>
  <div class="flex gap-4">
    <UTooltip
      data-test="address-tooltip"
      text="Click to see address in block explorer"
      @click="openExplorer(address)"
    >
      <span class="cursor-pointer underline">{{
        slice ? `${address.slice(0, 6)}...${address.slice(-4)}` : address
      }}</span>
    </UTooltip>

    <UTooltip
      data-test="copy-address-tooltip"
      :text="copied ? 'Copied!' : 'Click to copy address'"
      @click="
        () => {
          copy(address)
        }
      "
      v-if="isSupported"
    >
      <IconifyIcon
        icon="heroicons:clipboard-document"
        class="h-5 w-5 text-gray-400 transition-colors duration-200 hover:text-gray-600"
      />
    </UTooltip>
  </div>
</template>

<script setup lang="ts">
import { useClipboard } from '@vueuse/core'
import { NETWORK } from '@/constant'
import { Icon as IconifyIcon } from '@iconify/vue'

const { type } = defineProps<{
  address: string
  slice?: boolean
  type?: 'address' | 'transaction'
}>()

const { copy, copied, isSupported } = useClipboard()
const openExplorer = (address: string) => {
  if (type === 'transaction') {
    window.open(`${NETWORK.blockExplorerUrl}/tx/${address}`, '_blank')
    return
  }
  window.open(`${NETWORK.blockExplorerUrl}/address/${address}`, '_blank')
}
</script>
