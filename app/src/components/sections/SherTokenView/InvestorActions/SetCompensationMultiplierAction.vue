<template>
  <div v-if="safeDepositRouterAddress">
    <ActionButton
      icon="heroicons:calculator"
      icon-bg="bg-amber-50 dark:bg-amber-950"
      icon-color="text-amber-700 dark:text-amber-400"
<<<<<<< Updated upstream:app/src/components/sections/SherTokenView/InvestorActions/SetCompensationMultiplierAction.vue
      title="Set Multiplier"
      tone-class="border-orange-200 bg-orange-50/60 hover:border-orange-300 hover:bg-orange-100/70 disabled:border-orange-200 disabled:bg-orange-50/50 dark:border-orange-900 dark:bg-orange-950/30 dark:hover:border-orange-800 dark:hover:bg-orange-900/40 dark:disabled:border-orange-900 dark:disabled:bg-orange-950/30"
=======
>>>>>>> Stashed changes:app/src/components/sections/SherTokenView/InvestorActions/SetCompensationMultiplierButton.vue
      :loading="isLoading"
      :disabled="!canManageMultiplier || isLoading"
      :badge="
        !isMultiplierLoading && formattedCurrentMultiplier !== '0'
          ? `${formattedCurrentMultiplier}x`
          : undefined
      "
      data-test="set-compensation-multiplier-button"
      @click="openModal"
<<<<<<< Updated upstream:app/src/components/sections/SherTokenView/InvestorActions/SetCompensationMultiplierAction.vue
    />
=======
    >
      {{ `Set\nMultiplier` }}
    </ActionButton>
>>>>>>> Stashed changes:app/src/components/sections/SherTokenView/InvestorActions/SetCompensationMultiplierButton.vue

    <dialog ref="modalRef" class="modal" data-test="multiplier-modal">
      <div class="modal-box">
        <h3 class="mb-4 text-lg font-bold">Set SHER Compensation Multiplier</h3>

        <div class="mb-4">
          <p class="text-base-content/70 mb-2 text-sm">
            Current multiplier:
            <span class="font-semibold" data-test="current-multiplier">
              {{ isMultiplierLoading ? 'Loading...' : `${formattedCurrentMultiplier}x` }}
            </span>
          </p>
          <p class="text-base-content/70 text-sm">
            The multiplier determines how many SHER tokens are minted per deposited token. You can
            use decimal values (e.g., 1.5, 2.75).
          </p>
        </div>

        <div class="form-control w-full">
          <label class="label">
            <span class="label-text">New Multiplier</span>
          </label>
          <input
            v-model="newMultiplier"
            type="text"
            inputmode="decimal"
            placeholder="Enter multiplier (e.g., 1.5)"
            class="input input-bordered w-full"
            data-test="multiplier-input"
            :disabled="isLoading"
          />
          <label class="label" v-if="multiplierError">
            <span class="label-text-alt text-error" data-test="multiplier-error">
              {{ multiplierError }}
            </span>
          </label>
          <label class="label" v-else>
            <span class="label-text-alt">
              Example: Multiplier of {{ displayMultiplierExample }} means 1 USDC =
              {{ displayMultiplierExample }} SHER
            </span>
          </label>
        </div>

        <div class="modal-action">
          <UButton
            variant="ghost"
            :disabled="isLoading"
            data-test="cancel-button"
            @click="closeModal"
            label="Cancel"
          />
          <UButton
            color="primary"
            :loading="isLoading"
            :disabled="!isMultiplierValid || isLoading"
            data-test="confirm-button"
            @click="handleSetMultiplier"
            label="Update Multiplier"
          />
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button @click="closeModal">close</button>
      </form>
    </dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useConnection } from '@wagmi/vue'
import ActionButton from '@/components/sections/SherTokenView/ActionButton.vue'
import { useSetMultiplier } from '@/composables/safeDepositRouter/writes'
import {
  useSafeDepositRouterAddress,
  useSafeDepositRouterMultiplier,
  useSafeDepositRouterOwner
} from '@/composables/safeDepositRouter/reads'
import { parseError } from '@/utils'
import {
  formatSafeDepositRouterMultiplier,
  parseSafeDepositRouterMultiplier,
  formatSherAmount
} from '@/utils/safeDepositRouterUtil'

const toast = useToast()
const connection = useConnection()

const modalRef = ref<HTMLDialogElement | null>(null)
const newMultiplier = ref<string>('1')

const MULTIPLIER_DECIMALS = 6
const MIN_MULTIPLIER = 1
const MAX_MULTIPLIER = 1000000

const safeDepositRouterAddress = useSafeDepositRouterAddress()

const { data: currentMultiplier, isLoading: isMultiplierLoading } = useSafeDepositRouterMultiplier()
const { data: owner, isLoading: isOwnerLoading } = useSafeDepositRouterOwner()

const setMultiplierWrite = useSetMultiplier()

const formattedCurrentMultiplier = computed(() => {
  const safeMultiplier =
    typeof currentMultiplier.value === 'bigint' ? currentMultiplier.value : undefined
  return formatSafeDepositRouterMultiplier(safeMultiplier, MULTIPLIER_DECIMALS)
})

const displayMultiplierExample = computed(() => {
  if (!newMultiplier.value || newMultiplier.value === '') return '1'
  return formatSherAmount(newMultiplier.value, MULTIPLIER_DECIMALS)
})

const isReadLoading = computed(() => isMultiplierLoading.value || isOwnerLoading.value)
const isWriteLoading = computed(() => setMultiplierWrite.writeResult.isPending.value)
const isLoading = computed(() => isReadLoading.value || isWriteLoading.value)

const canManageMultiplier = computed(() => {
  if (!connection.isConnected.value || !connection.address?.value) return false
  if (!owner.value) return false
  return connection.address.value.toLowerCase() === (owner.value as string).toLowerCase()
})

const multiplierError = computed(() => {
  if (!newMultiplier.value || newMultiplier.value === '') return 'Multiplier is required'
  const numValue = parseFloat(newMultiplier.value)
  if (isNaN(numValue)) return 'Must be a valid number'
  if (numValue < MIN_MULTIPLIER) return `Multiplier must be at least ${MIN_MULTIPLIER}`
  if (numValue > MAX_MULTIPLIER) return 'Multiplier is too large'
  return null
})

const isMultiplierValid = computed(() => {
  if (multiplierError.value) return false
  const currentValue = parseFloat(formattedCurrentMultiplier.value)
  const newValue = parseFloat(newMultiplier.value)
  return !isNaN(newValue) && newValue !== currentValue
})

watch(
  () => setMultiplierWrite.writeResult.error.value,
  (error) => {
    if (error) {
      console.error('Error setting multiplier:', error)
      const errorMessage = parseError(error)
      if (errorMessage.includes('User rejected') || errorMessage.includes('User denied')) {
        toast.add({ title: 'Transaction cancelled by user', color: 'error' })
      } else {
        toast.add({ title: 'Failed to update multiplier', color: 'error' })
      }
    }
  }
)

watch(
  () => setMultiplierWrite.receiptResult.isSuccess.value,
  (success) => {
    if (success) {
      toast.add({
        title: `Multiplier updated successfully to ${formatSherAmount(newMultiplier.value, MULTIPLIER_DECIMALS)}x`,
        color: 'success'
      })
      closeModal()
    }
  }
)

watch(
  formattedCurrentMultiplier,
  (value) => {
    if (value !== undefined && value !== null && value !== '0') {
      newMultiplier.value = value
    }
  },
  { immediate: true }
)

function openModal() {
  if (!canManageMultiplier.value) {
    toast.add({ title: 'Only the owner can set the multiplier', color: 'error' })
    return
  }
  if (formattedCurrentMultiplier.value !== '0') {
    newMultiplier.value = formattedCurrentMultiplier.value
  }
  modalRef.value?.showModal()
}

function closeModal() {
  modalRef.value?.close()
}

async function handleSetMultiplier() {
  if (!safeDepositRouterAddress.value) {
    toast.add({ title: 'SafeDepositRouter address not found', color: 'error' })
    return
  }
  if (!canManageMultiplier.value) {
    toast.add({ title: 'Only the owner can set the multiplier', color: 'error' })
    return
  }
  if (!isMultiplierValid.value) {
    toast.add({ title: 'Please enter a valid multiplier', color: 'error' })
    return
  }
  try {
    const multiplierInWei = parseSafeDepositRouterMultiplier(
      newMultiplier.value,
      MULTIPLIER_DECIMALS
    )
    if (multiplierInWei === 0n) {
      toast.add({ title: 'Invalid multiplier format', color: 'error' })
      return
    }
    await setMultiplierWrite.executeWrite(multiplierInWei)
  } catch (error) {
    console.error('Error formatting multiplier:', error)
    toast.add({ title: 'Invalid multiplier format', color: 'error' })
  }
}
</script>
