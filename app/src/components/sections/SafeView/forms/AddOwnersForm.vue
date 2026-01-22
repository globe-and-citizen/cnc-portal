<template>
  <div class="flex flex-col gap-5 max-w-2xl">
    <div class="flex items-center justify-between">
      <h2 class="font-bold text-2xl">Configure Safe Owners</h2>
    </div>

    <hr />

    <div class="space-y-6">
      <!-- Add New Owners Section -->
      <div>
        <SelectMemberInput
          @selectMember="addNewOwner"
          :hiddenMembers="hiddenMembersForSelection"
          :show-on-focus="true"
          :disable-team-members="false"
          :only-team-members="false"
          data-test="new-owners-input"
        />
        <div class="text-sm text-gray-600 mt-2">
          Search by member name or address to add as Safe owner
        </div>
      </div>

      <!-- Local Owners Section -->
      <div>
        <div class="flex items-center justify-between mb-3">
          <h3 class="font-semibold text-lg">Signers ({{ localOwners.length }})</h3>
          <ButtonUI
            size="xs"
            variant="secondary"
            outline
            class="flex items-center gap-1"
            @click="resetRemovedOwners"
            :disabled="ownersToRemove.length === 0 || isLoading"
            data-test="refresh-owners-button"
          >
            <IconifyIcon icon="heroicons:arrow-path" class="w-3 h-3" />
            Refresh owners
          </ButtonUI>
        </div>
        <div v-if="localOwners.length" class="space-y-2 max-h-48 overflow-y-auto">
          <div
            v-for="(owner, index) in localOwners"
            :key="owner"
            class="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            data-test="current-owner-item"
          >
            <div class="text-sm flex items-center gap-3">
              <span class="font-medium text-gray-600">{{ index + 1 }}</span>
              <span><AddressToolTip :address="owner" /></span>
              <span
                v-if="!isExistingOwner(owner)"
                class="text-xs font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full"
              >
                New
              </span>
            </div>
            <ButtonUI
              size="xs"
              variant="error"
              outline
              @click="handleRemoveOwner(owner)"
              :disabled="localOwners.length <= 1 || isLoading"
              data-test="remove-owner-button"
            >
              <IconifyIcon icon="heroicons:trash" class="w-3 h-3" />
            </ButtonUI>
          </div>
        </div>
        <div
          v-else
          class="text-sm text-gray-600 bg-gray-50 rounded-lg p-3 flex items-center justify-between"
        >
          <span>All local owners are marked for removal.</span>
          <span class="text-gray-500">Use refresh to restore the list.</span>
        </div>
      </div>

      <!-- Threshold Configuration -->
      <div>
        <label class="block font-semibold text-lg mb-3"> Signature Threshold </label>
        <div class="flex items-center gap-4">
          <div class="flex items-center gap-2">
            <label class="text-sm font-medium text-gray-600 w-20">Threshold:</label>
            <input
              type="number"
              :min="1"
              :max="totalOwnersAfterUpdate"
              v-model.number="threshold"
              class="input input-bordered input-sm w-20"
              data-test="threshold-input"
            />
          </div>
          <span class="text-sm text-gray-500">
            of {{ totalOwnersAfterUpdate }} owners required to execute transactions
          </span>
        </div>
        <div
          v-for="error in $v.threshold.$errors"
          :key="error.$uid"
          class="text-red-500 text-sm mt-1"
          data-test="threshold-error"
        >
          {{ error.$message }}
        </div>
      </div>

      <!-- Changes Preview Section -->
      <div v-if="hasChanges" class="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 class="font-semibold text-blue-800 mb-2 flex items-center gap-2">
          <IconifyIcon icon="heroicons:eye" class="w-4 h-4" />
          Changes Preview
        </h4>
        <div class="text-sm text-blue-700 space-y-1">
          <div v-if="newOwners.length > 0" class="flex items-center gap-2">
            <IconifyIcon icon="heroicons:plus-circle" class="w-4 h-4 text-green-600" />
            Adding {{ newOwners.length }} new owner(s):
            <span class="font-mono text-xs">
              {{
                newOwners
                  .map((owner) => `${owner.address?.slice(0, 6)}...${owner.address?.slice(-4)}`)
                  .join(', ')
              }}
            </span>
          </div>
          <div v-if="ownersToRemove.length > 0" class="flex items-center gap-2">
            <IconifyIcon icon="heroicons:minus-circle" class="w-4 h-4 text-red-600" />
            Removing {{ ownersToRemove.length }} owner(s):
            <span class="font-mono text-xs">
              {{
                ownersToRemove.map((addr) => `${addr.slice(0, 6)}...${addr.slice(-4)}`).join(', ')
              }}
            </span>
          </div>
          <div v-if="threshold !== currentThreshold" class="flex items-center gap-2">
            <IconifyIcon icon="heroicons:adjustments-horizontal" class="w-4 h-4 text-blue-600" />
            Updating threshold from {{ currentThreshold }} to {{ threshold }}
          </div>
        </div>
      </div>
    </div>

    <!-- Action Buttons -->
    <div class="flex justify-end gap-3 pt-4 border-t">
      <ButtonUI
        variant="ghost"
        @click="$emit('close-modal')"
        :disabled="isLoading"
        data-test="cancel-button"
      >
        Cancel
      </ButtonUI>
      <ButtonUI
        variant="primary"
        :loading="isLoading"
        :disabled="!hasChanges || !isValidConfiguration || isLoading"
        @click="handleUpdateOwners"
        data-test="update-owners-button"
        class="flex items-center gap-2"
      >
        <IconifyIcon v-if="!isLoading" icon="heroicons:check-circle" class="w-4 h-4" />
        Update Safe Configuration
      </ButtonUI>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useVuelidate } from '@vuelidate/core'
import { required, minValue, maxValue } from '@vuelidate/validators'
import { isAddress, type Address } from 'viem'
import ButtonUI from '@/components/ButtonUI.vue'
import AddressToolTip from '@/components/AddressToolTip.vue'
import SelectMemberInput from '@/components/utils/SelectMemberInput.vue'
import { Icon as IconifyIcon } from '@iconify/vue'
import { useTeamStore, useToastStore } from '@/stores'
import { useSafeOwnerManagement } from '@/composables/safe'
import type { User } from '@/types'

interface Props {
  safeAddress: Address
  currentOwners: string[]
  currentThreshold: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'owners-updated': []
  'close-modal': []
}>()

const teamStore = useTeamStore()
const { addSuccessToast, addErrorToast } = useToastStore()

// Use new Safe owner management composable
const { isUpdating, updateOwners } = useSafeOwnerManagement()

// Form state
const newOwners = ref<User[]>([])
const ownersToRemove = ref<string[]>([])
const threshold = ref(props.currentThreshold)

// Use isUpdating directly from composable
const isLoading = computed(() => isUpdating.value)

// Computed values
const localOwners = computed(() => {
  const owners = props.currentOwners.filter((owner) => !ownersToRemove.value.includes(owner))

  newOwners.value.forEach(({ address }) => {
    if (!address || !isAddress(address)) return

    const exists = owners.some((existing) => existing.toLowerCase() === address.toLowerCase())
    if (!exists) {
      owners.push(address)
    }
  })

  return owners
})

const totalOwnersAfterUpdate = computed(() => localOwners.value.length)

const requiresProposal = computed(() => props.currentThreshold >= 2)

const hiddenMembersForSelection = computed((): User[] => {
  const currentOwnerUsers = props.currentOwners.map((address) => {
    const teamMember = teamStore.currentTeam?.members.find(
      (member) => member.address?.toLowerCase() === address.toLowerCase()
    )

    return {
      name: teamMember?.name || `Owner ${address.slice(0, 6)}...${address.slice(-4)}`,
      address: address as Address,
      imageUrl: teamMember?.imageUrl
    }
  })

  const seen = new Set<string>()
  return [...currentOwnerUsers, ...newOwners.value].filter((user) => {
    const addr = user.address?.toLowerCase()
    if (!addr) return false
    if (seen.has(addr)) return false
    seen.add(addr)
    return true
  })
})

const hasChanges = computed(() => {
  return (
    newOwners.value.length > 0 ||
    ownersToRemove.value.length > 0 ||
    threshold.value !== props.currentThreshold
  )
})

const isValidConfiguration = computed(() => {
  return (
    totalOwnersAfterUpdate.value >= 1 &&
    threshold.value >= 1 &&
    threshold.value <= totalOwnersAfterUpdate.value &&
    localOwners.value.every((addr) => isAddress(addr))
  )
})

// Validation rules
const rules = {
  threshold: {
    required,
    minValue: minValue(1),
    maxValue: maxValue(totalOwnersAfterUpdate)
  }
}

const $v = useVuelidate(rules, { threshold })

// Helper functions
const isExistingOwner = (ownerAddress: string): boolean => {
  return props.currentOwners.some((owner) => owner.toLowerCase() === ownerAddress.toLowerCase())
}

// Methods
const addNewOwner = (member: User) => {
  const address = member?.address?.trim()

  if (!address) {
    addErrorToast('Selected member has no address')
    return
  }

  if (!isAddress(address)) {
    addErrorToast('Please select a valid address')
    return
  }

  const addressLower = address.toLowerCase()

  if (isExistingOwner(addressLower)) {
    addErrorToast('Address is already a Safe owner')
    return
  }

  const alreadyAdded = newOwners.value.some(
    (owner) => owner.address?.toLowerCase() === addressLower
  )
  if (alreadyAdded) {
    addErrorToast('Owner already added to the list')
    return
  }

  newOwners.value.push(member)
  addSuccessToast('Owner added locally')
}

const removeOwner = (ownerAddress: string) => {
  if (localOwners.value.length <= 1) {
    addErrorToast('Cannot remove the last owner')
    return
  }

  if (!ownersToRemove.value.includes(ownerAddress)) {
    ownersToRemove.value.push(ownerAddress)
    addSuccessToast(`Owner marked for removal`)
  }
}

const removeNewOwner = (ownerAddress: string) => {
  if (localOwners.value.length <= 1) {
    addErrorToast('Cannot remove the last owner')
    return
  }

  const index = newOwners.value.findIndex(
    (owner) => owner.address?.toLowerCase() === ownerAddress.toLowerCase()
  )

  if (index > -1) {
    newOwners.value.splice(index, 1)
    addSuccessToast('Owner removed from additions')
  }
}

const handleRemoveOwner = (ownerAddress: string) => {
  if (isExistingOwner(ownerAddress)) {
    removeOwner(ownerAddress)
  } else {
    removeNewOwner(ownerAddress)
  }
}

const resetRemovedOwners = () => {
  ownersToRemove.value = []
  addSuccessToast('All owners restored')
}

const handleUpdateOwners = async () => {
  $v.value.$touch()

  if ($v.value.$invalid) {
    addErrorToast('Please fix validation errors before proceeding')
    return
  }

  if (!hasChanges.value) {
    addErrorToast('No changes to apply')
    return
  }

  // Additional validation: check for duplicate addresses
  const duplicates = newOwners.value
    .map((owner) => owner.address?.toLowerCase())
    .filter((addr, index, array) => addr && array.indexOf(addr) !== index)

  if (duplicates.length > 0) {
    addErrorToast('Duplicate addresses detected in new owners selection')
    return
  }

  try {
    const ownersToAdd = newOwners.value
      .map((owner) => owner.address)
      .filter((addr): addr is string => !!addr && isAddress(addr))

    // Simple async function call with automatic reactivity via TanStack Query
    const txHash = await updateOwners(props.safeAddress, {
      ownersToAdd,
      ownersToRemove: ownersToRemove.value,
      newThreshold: threshold.value !== props.currentThreshold ? threshold.value : undefined,
      shouldPropose: requiresProposal.value
    })

    if (!txHash) {
      throw new Error('Failed to update Safe owners')
    }

    // Reset form state on successful update
    newOwners.value = []
    ownersToRemove.value = []

    emit('owners-updated')
  } catch (error) {
    console.error('Error updating Safe owners:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to update Safe owners'
    addErrorToast(errorMessage)
  }
}

// Watch threshold changes and validate
watch(
  () => totalOwnersAfterUpdate.value,
  (newTotal) => {
    if (threshold.value > newTotal) {
      threshold.value = newTotal
    }
  }
)
</script>
