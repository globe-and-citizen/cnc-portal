<template>
  <ButtonUI
    size="sm"
    variant="error"
    outline
    :disabled="isDisabled"
    :loading="isRemoving"
    @click="handleRemove"
    data-test="remove-owner-button"
    class="flex items-center gap-1"
  >
    <IconifyIcon icon="heroicons:trash" class="w-4 h-4" />
  </ButtonUI>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useAccount } from '@wagmi/vue'
import { Icon as IconifyIcon } from '@iconify/vue'
import { type Address } from 'viem'

import ButtonUI from '@/components/ButtonUI.vue'
import { useSafeOwnerManagement } from '@/composables/safe'
import { log } from '@/utils'

interface Props {
  ownerAddress: string
  safeAddress: Address
  totalOwners: number
  threshold: number
  isConnectedUserOwner: boolean
}

const props = defineProps<Props>()

const { address: connectedAddress } = useAccount()
const { updateOwners, isUpdating } = useSafeOwnerManagement()

const isRemoving = ref(false)

// Computed properties
const isCurrentUserAddress = computed(() => {
  return connectedAddress.value?.toLowerCase() === props.ownerAddress.toLowerCase()
})

const isDisabled = computed(() => {
  return (
    props.totalOwners <= 1 ||
    isRemoving.value ||
    isUpdating.value ||
    !props.isConnectedUserOwner ||
    isCurrentUserAddress.value
  )
})

// Methods
const handleRemove = async () => {
  if (props.totalOwners <= 1) {
    log.warn('Cannot remove the last owner', { ownerAddress: props.ownerAddress })
    return
  }

  if (isCurrentUserAddress.value) {
    log.warn('Cannot remove self as owner', { ownerAddress: props.ownerAddress })
    return
  }

  isRemoving.value = true

  try {
    log.info('Attempting to remove owner:', { ownerAddress: props.ownerAddress })
    const txHash = await updateOwners(props.safeAddress, {
      ownersToRemove: [props.ownerAddress],
      shouldPropose: props.threshold >= 2
    })
    if (txHash) {
      log.info('Owner removal transaction submitted:', {
        txHash,
        ownerAddress: props.ownerAddress
      })
    }
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Failed to remove owner')
    log.error('Failed to remove owner:', err, { ownerAddress: props.ownerAddress })
  } finally {
    isRemoving.value = false
  }
}
</script>
