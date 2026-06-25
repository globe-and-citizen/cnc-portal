<template>
  <UModal
    v-model:open="isOpen"
    title="Add Safe Signers"
    description="Add one or more new signers to the Safe and manage multisig approval rules."
    :close="{ onClick: () => handleClose() }"
    data-test="add-signer-modal"
  >
    <template #body>
      <UAlert
        v-if="errorMessage"
        color="error"
        variant="soft"
        :description="errorMessage"
        class="mb-4"
      />
      <UForm
        :schema="formSchema"
        :state="formState"
        class="max-w-2xl space-y-6"
        @submit="handleAddSigners"
      >
        <!-- Add Signers Section -->
        <UFormField name="newSigners" class="w-full">
          <MultiSelectMemberInput
            v-model="newSigners"
            :disable-team-members="false"
            :current-safe-owners="props.currentOwners"
            data-test="new-signers-input"
          />
        </UFormField>

        <!-- Summary -->
        <div v-if="newSigners.length > 0" class="rounded-lg bg-gray-50 p-4">
          <h4 class="mb-2 font-semibold">Summary</h4>
          <div class="space-y-1 text-sm text-gray-700">
            <div class="flex items-center gap-2">
              <IconifyIcon icon="heroicons:plus-circle" class="h-4 w-4 text-green-600" />
              Adding {{ newSigners.length }} new signer{{ newSigners.length > 1 ? 's' : '' }}
            </div>
            <div class="flex items-center gap-2">
              <IconifyIcon icon="heroicons:users" class="h-4 w-4 text-blue-600" />
              Total signers after update: {{ totalSignersAfterUpdate }}
            </div>
          </div>
        </div>

        <!-- Transaction Note -->
        <div
          v-if="requiresProposal && newSigners.length > 0"
          class="rounded-lg border border-yellow-200 bg-yellow-50 p-4"
        >
          <div class="flex items-start gap-2">
            <IconifyIcon
              icon="heroicons:exclamation-triangle"
              class="mt-0.5 h-5 w-5 text-yellow-600"
            />
            <div class="text-sm text-yellow-800">
              <p class="mb-1 font-semibold">Multi-signature Required</p>
              <p>
                This transaction requires approval from {{ currentThreshold }} signers before
                execution.
              </p>
            </div>
          </div>
        </div>
        <!-- Action Buttons -->
        <div class="flex justify-end gap-3 border-t pt-4">
          <UButton
            color="neutral"
            variant="ghost"
            type="button"
            @click="handleClose"
            :disabled="isLoading"
            data-test="cancel-button"
          >
            Cancel
          </UButton>

          <TeamArchivedTooltip v-slot="{ disabled: archivedDisabled }">
            <UButton
              color="primary"
              type="submit"
              :disabled="!canSubmit || isLoading || archivedDisabled"
              :loading="isLoading"
              data-test="add-signers-button"
            >
              {{ requiresProposal ? 'Propose' : 'Execute' }} Add Signers
            </UButton>
          </TeamArchivedTooltip>
        </div>
      </UForm>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { z } from 'zod'
import { type Address, isAddress } from 'viem'
import { useChainId } from '@wagmi/vue'
import MultiSelectMemberInput from '@/components/utils/MultiSelectMemberInput.vue'
import { Icon as IconifyIcon } from '@iconify/vue'

import { useUpdateSafeOwnersMutation } from '@/queries/safe.mutations'
import type { User } from '@/types'
import { useToast } from '@nuxt/ui/composables'
import TeamArchivedTooltip from '@/components/ui/TeamArchivedTooltip.vue'

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

const toast = useToast()
const chainId = useChainId()
const errorMessage = ref('')

// Stores and composables
const { mutate: updateOwners, isPending: isLoading } = useUpdateSafeOwnersMutation()

// Modal state
const isOpen = defineModel<boolean>({ default: false })

const newSigners = ref<User[]>([])
const requiresProposal = computed(() => props.currentThreshold >= 2)

// Transform newSigners to match form schema expectations
const formState = computed(() => ({
  newSigners: newSigners.value.map((signer) => ({
    address: signer.address || ''
  })),
  newThreshold: props.currentThreshold,
  shouldPropose: requiresProposal.value
}))

// Computed values
const totalSignersAfterUpdate = computed(() => {
  return props.currentOwners.length + validNewSigners.value.length
})

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

const formSchema = computed(() =>
  z
    .object({
      newSigners: z
        .array(
          z.object({
            address: z.string().refine((address) => isAddress(address), 'Invalid signer address')
          })
        )
        .min(1, 'Please add at least one signer')
        .refine(() => validNewSigners.value.length > 0, 'Please add at least one valid signer'),
      newThreshold: z.number().optional(),
      shouldPropose: z.boolean()
    })
    .refine(({ newSigners, newThreshold }) => !newSigners.length || newThreshold !== undefined, {
      message: 'newThreshold required when adding owners',
      path: ['newThreshold']
    })
)

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
      errorMessage.value = 'Cannot add existing signers'
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
    errorMessage.value = 'Please add at least one valid signer'
    return
  }

  errorMessage.value = ''
  const ownersToAdd = validNewSigners.value.map((signer) => signer.address as string)

  updateOwners(
    {
      pathParams: {
        safeAddress: props.safeAddress
      },
      queryParams: {
        chainId: chainId.value
      },
      body: {
        ownersToAdd,
        newThreshold: props.currentThreshold,
        shouldPropose: requiresProposal.value
      }
    },
    {
      onSuccess: () => {
        const message = requiresProposal.value
          ? 'Signer addition proposal submitted successfully'
          : 'Signers added successfully'
        toast.add({ title: 'Success', description: message, color: 'success' })

        emit('signer-added')
        handleClose()
      },
      onError: (error) => {
        console.error('Failed to add signers:', error)
        errorMessage.value =
          error instanceof Error && error.message
            ? `Failed to add signers: ${error.message}`
            : 'Failed to add signers'
      }
    }
  )
}

const handleClose = () => {
  newSigners.value = []
  errorMessage.value = ''
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
