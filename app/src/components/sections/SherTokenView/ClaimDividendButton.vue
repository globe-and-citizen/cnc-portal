<template>
  <UButton
    color="primary"
    size="sm"
    data-test="claim-dividend"
    :disabled="isDisabled"
    :loading="isClaiming"
    @click="handleClaim"
  >
    {{ isClaiming ? 'Claiming' : 'Claim' }}
  </UButton>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Address } from 'viem'
import { useToastStore } from '@/stores'
import { useClaimDividend, useClaimTokenDividend } from '@/composables/bank/bankWrites'

interface Props {
  tokenAddress: Address
  isNative: boolean
  balance: string
}

interface Emits {
  (e: 'success'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const toast = useToastStore()
const isClaiming = ref(false)

// Initialize the appropriate composable based on token type
const nativeClaimWrite = useClaimDividend()
const tokenClaimWrite = useClaimTokenDividend(computed(() => props.tokenAddress))

const isDisabled = computed(() => {
  return props.balance === '0' || isClaiming.value
})

const handleClaim = async () => {
  isClaiming.value = true

  try {
    if (props.isNative) {
      await nativeClaimWrite.executeWrite()
    } else {
      await tokenClaimWrite.executeWrite()
    }

    toast.addSuccessToast('Dividend claimed successfully')
    emit('success')
  } catch (err) {
    toast.addErrorToast('Failed to claim dividend')
    console.error('Claim error:', err)
  } finally {
    isClaiming.value = false
  }
}
</script>
