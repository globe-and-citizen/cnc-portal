<template>
  <div
    role="button"
    class="flex items-center cursor-pointer badge badge-md badge-info text-xs mr-6"
    @click="
      () => {
        if (!disabled) isDropdown = !isDropdown
      }
    "
    data-test="token-selector"
  >
    <span>{{ formattedTokenSymbol }}</span>
    <IconifyIcon v-if="!disabled" icon="heroicons-outline:chevron-down" class="w-4 h-4" />
  </div>
  <ul
    class="absolute right-0 mt-2 menu bg-base-200 border-2 rounded-box z-[1] p-2 shadow"
    ref="target"
    data-test="token-dropdown"
    v-if="isDropdown"
  >
    <li
      v-for="token in tokens"
      :key="token"
      @click="
        () => {
          selectedToken = token
          emits('tokenSelected', token)
          isDropdown = false
        }
      "
    >
      <a>{{ token }}</a>
    </li>
  </ul>
</template>
<script lang="ts" setup>
import { ref, computed } from 'vue'
import { Icon as IconifyIcon } from '@iconify/vue'
import { NETWORK } from '@/constant'

const props = defineProps({
  tokenSymbol: {
    type: String,
    default: NETWORK.currencySymbol
  },
  disabled: {
    type: Boolean,
    default: false
  }
})
const emits = defineEmits(['tokenSelected'])
const tokens = [NETWORK.currencySymbol, 'USDC', 'SHER']

const isDropdown = ref(false)
const selectedToken = ref(props.disabled ? props.tokenSymbol : tokens[0])

const formattedTokenSymbol = computed(() => {
  const symbol = selectedToken.value
  // Replace 'SepoliaETH' with 'SepETH' for display purposes
  return symbol === 'SepoliaETH' ? 'SepETH' : symbol
})
</script>
