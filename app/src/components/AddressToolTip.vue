<template>
  <div class="flex gap-4">
    <ToolTip
      data-test="address-tooltip"
      content="Click to see address in block explorer"
      @click="openExplorer(address)"
    >
      <span class="cursor-pointer underline">{{
        slice ? `${address.slice(0, 6)}...${address.slice(-4)}` : address
      }}</span>
    </ToolTip>

    <ToolTip
      data-test="copy-address-tooltip"
      :content="copied ? 'Copied!' : 'Click to copy address'"
      @click="
        () => {
          copy(address)
          console.log('copied', copied)
        }
      "
      v-if="isSupported"
    >
      <ClipboardDocumentListIcon class="size-5 cursor-pointer" v-if="!copied" />
      <ClipboardDocumentCheckIcon v-if="copied" class="size-5" />
    </ToolTip>
  </div>
</template>

<script setup lang="ts">
import { useClipboard } from '@vueuse/core'
import { ClipboardDocumentListIcon, ClipboardDocumentCheckIcon } from '@heroicons/vue/24/outline'
import { NETWORK } from '@/constant'
import ToolTip from './ToolTip.vue'
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
