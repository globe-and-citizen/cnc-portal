<template>
  <div
    role="button"
    class="badge badge-md badge-info mr-6 flex cursor-pointer items-center text-xs"
    @click="
      () => {
        if (!disabled) isDropdown = !isDropdown
      }
    "
    data-test="token-selector"
  >
    <span>{{ formattedTokenSymbol }}</span>
    <IconifyIcon v-if="!disabled" icon="heroicons-outline:chevron-down" class="h-4 w-4" />
  </div>
  <ul
    class="menu bg-base-200 rounded-box absolute right-0 z-1 mt-2 border-2 p-2 shadow-sm"
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
