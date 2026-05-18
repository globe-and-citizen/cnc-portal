<template>
  <UButton
    size="sm"
    color="error"
    variant="outline"
    :disabled="isDisabled"
    :loading="isRemoving"
    @click="handleRemove"
    data-test="remove-owner-button"
    class="flex items-center gap-1"
  >
    <IconifyIcon icon="heroicons:trash" class="h-4 w-4" />
  </UButton>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useAccount, useChainId } from '@wagmi/vue'
import { Icon as IconifyIcon } from '@iconify/vue'
import { type Address } from 'viem'

import { useUpdateSafeOwnersMutation } from '@/queries/safe.mutations'

interface Props {
  ownerAddress: string
  safeAddress: Address
  totalOwners: number
  threshold: number
  isConnectedUserOwner: boolean
}

const props = defineProps<Props>()

const toast = useToast()
const chainId = useChainId()
const { address: connectedAddress } = useAccount()
const { mutate: updateOwners, isPending: isUpdating } = useUpdateSafeOwnersMutation()

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
    isCurrentUserAddress.value ||
    props.totalOwners <= props.threshold
  )
})

// Methods
const handleRemove = async () => {
  if (props.totalOwners <= 1) {
    return
  }

  if (isCurrentUserAddress.value) {
    return
  }

  isRemoving.value = true

  updateOwners(
    {
      pathParams: { safeAddress: props.safeAddress },
      queryParams: { chainId: chainId.value },
      body: {
        ownersToRemove: [props.ownerAddress],
        shouldPropose: props.threshold >= 2
      }
    },
    {
      onSuccess: () => {
        const message =
          props.threshold >= 2
            ? 'Owner removal proposal submitted successfully'
            : 'Owner removed successfully'
        toast.add({ title: 'Success', description: message, color: 'success' })
        isRemoving.value = false
      },
      onError: (error) => {
        console.error('Failed to remove owner:', error)
        const message =
          error instanceof Error && error.message.includes('User rejected')
            ? 'Transaction approval rejected'
            : 'Failed to remove owner'
        toast.add({ title: 'Error', description: message, color: 'error' })
        isRemoving.value = false
      }
    }
  )
}
</script>
