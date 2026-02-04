<template>
  <ModalComponent v-model="isOpen" @reset="handleClose" data-test="add-signer-modal">
    <div class="flex flex-col gap-5 max-w-2xl">
      <div class="flex items-center justify-between">
        <h2 class="font-bold text-2xl">Add Safe Signers</h2>
      </div>

      <hr />

      <div class="space-y-6">
        <!-- Add Signers Section -->
        <div>
          <MultiSelectMemberInput v-model="newSigners" :disable-team-members="false" />
        </div>

        <!-- Summary -->
        <div v-if="newSigners.length > 0" class="bg-gray-50 rounded-lg p-4">
          <h4 class="font-semibold mb-2">Summary</h4>
          <div class="text-sm text-gray-700 space-y-1">
            <div class="flex items-center gap-2">
              <IconifyIcon icon="heroicons:plus-circle" class="w-4 h-4 text-green-600" />
              Adding {{ newSigners.length }} new signer{{ newSigners.length > 1 ? 's' : '' }}
            </div>
            <div class="flex items-center gap-2">
              <IconifyIcon icon="heroicons:users" class="w-4 h-4 text-blue-600" />
              Total signers after update: {{ totalSignersAfterUpdate }}
            </div>
          </div>
        </div>

        <!-- Transaction Note -->
        <div
          v-if="requiresProposal && newSigners.length > 0"
          class="bg-yellow-50 border border-yellow-200 rounded-lg p-4"
        >
          <div class="flex items-start gap-2">
            <IconifyIcon
              icon="heroicons:exclamation-triangle"
              class="w-5 h-5 text-yellow-600 mt-0.5"
            />
            <div class="text-sm text-yellow-800">
              <p class="font-semibold mb-1">Multi-signature Required</p>
              <p>
                This transaction requires approval from {{ currentThreshold }} signers before
                execution.
              </p>
            </div>
          </div>
        </div>
        <!-- Action Buttons -->
        <div class="flex justify-end gap-3 pt-4 border-t">
          <ButtonUI
            variant="ghost"
            @click="handleClose"
            :disabled="isLoading"
            data-test="cancel-button"
          >
            Cancel
          </ButtonUI>

          <ButtonUI
            variant="primary"
            @click="handleAddSigners"
            :disabled="!canSubmit || isLoading"
            :loading="isLoading"
            data-test="add-signers-button"
          >
            {{ requiresProposal ? 'Propose' : 'Execute' }} Add Signers
          </ButtonUI>
        </div>
      </div>
    </div>
  </ModalComponent>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { type Address, isAddress } from 'viem'
import ModalComponent from '@/components/ModalComponent.vue'
import ButtonUI from '@/components/ButtonUI.vue'
import MultiSelectMemberInput from '@/components/utils/MultiSelectMemberInput.vue'
import { Icon as IconifyIcon } from '@iconify/vue'
import { useToastStore } from '@/stores'
import { useSafeOwnerManagement } from '@/composables/safe'
import type { User } from '@/types'

interface Props {
  safeAddress: Address
  currentOwners: string[]
  currentThreshold: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'signer-added': []
  'close-modal': []
}>()

// Stores and composables
const { addSuccessToast, addErrorToast } = useToastStore()
const { isUpdating: isLoading, updateOwners } = useSafeOwnerManagement()

// Modal state
const isOpen = defineModel<boolean>({ default: false })

const newSigners = ref<User[]>([])

// Computed values
const totalSignersAfterUpdate = computed(() => {
  return props.currentOwners.length + validNewSigners.value.length
})

const requiresProposal = computed(() => props.currentThreshold >= 2)

// Filter out invalid signers and existing owners (additional safety check)
const validNewSigners = computed(() => {
  return newSigners.value.filter((signer) => {
    // Must have valid address
    if (!signer.address || !isAddress(signer.address)) {
      return false
    }

    // Must not already be an owner (safety check, should be prevented by hiddenMembers)
    const isAlreadyOwner = props.currentOwners.some(
      (owner) => owner.toLowerCase() === signer.address?.toLowerCase()
    )

    return !isAlreadyOwner
  })
})

const canSubmit = computed(() => {
  return validNewSigners.value.length > 0
})

// Watch for validation issues (simplified since prevention is handled by hiddenMembers)
watch(
  newSigners,
  (newValue) => {
    const existingOwners = newValue.filter((signer) => {
      return props.currentOwners.some(
        (owner) => owner.toLowerCase() === signer.address?.toLowerCase()
      )
    })

    // Remove invalid signers automatically
    if (existingOwners.length > 0) {
      addErrorToast(`Cannot add existing signers`)
      newSigners.value = newSigners.value.filter((signer) => {
        const isExistingOwner = props.currentOwners.some(
          (owner) => owner.toLowerCase() === signer.address?.toLowerCase()
        )
        const hasValidAddress = signer.address && isAddress(signer.address)
        return !isExistingOwner && hasValidAddress
      })
    }
  },
  { deep: true }
)

const handleAddSigners = async () => {
  if (!canSubmit.value) {
    addErrorToast('Please add at least one valid signer')
    return
  }

  try {
    const ownersToAdd = validNewSigners.value.map((signer) => signer.address as string)

    const txHash = await updateOwners(props.safeAddress, {
      ownersToAdd,
      shouldPropose: requiresProposal.value
    })

    if (txHash) {
      const message = requiresProposal.value
        ? 'Signer addition proposal submitted successfully'
        : 'Signers added successfully'
      addSuccessToast(message)

      emit('signer-added')
      handleClose()
    }
  } catch (error) {
    console.error('Failed to add signers:', error)
    const message =
      error instanceof Error && error.message
        ? `Failed to add signers: ${error.message}`
        : 'Failed to add signers'
    addErrorToast(message)
  }
}

const handleClose = () => {
  newSigners.value = []
  isOpen.value = false
  emit('close-modal')
}

// Reset form when modal closes
watch(isOpen, (newValue) => {
  if (!newValue) {
    newSigners.value = []
  }
})
</script>
