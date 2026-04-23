<template>
  <div v-if="safeDepositRouterAddress">
    <ActionButton
      icon="heroicons:calculator"
      icon-bg="bg-amber-50 dark:bg-amber-950"
      icon-color="text-amber-700 dark:text-amber-400"
      title="Set Multiplier"
      tone-class="border-orange-200 bg-orange-50/60 hover:border-orange-300 hover:bg-orange-100/70 disabled:border-orange-200 disabled:bg-orange-50/50 dark:border-orange-900 dark:bg-orange-950/30 dark:hover:border-orange-800 dark:hover:bg-orange-900/40 dark:disabled:border-orange-900 dark:disabled:bg-orange-950/30"
      :loading="isLoading"
      :disabled="!canManageMultiplier || isLoading"
      :badge="
        !isMultiplierLoading && formattedCurrentMultiplier !== '0'
          ? `${formattedCurrentMultiplier}x`
          : undefined
      "
      data-test="set-compensation-multiplier-button"
      @click="openModal"
    />

    <UModal
      v-model:open="isModalOpen"
      title="Set SHER Compensation Multiplier"
      data-test="multiplier-modal"
    >
      <template #body>
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

        <UAlert
          v-if="submissionError"
          color="error"
          variant="soft"
          icon="i-heroicons-x-circle"
          :description="submissionError"
          class="mb-4"
          data-test="submission-error-alert"
        />

        <UForm
          :schema="formSchema"
          :state="formState"
          class="flex flex-col gap-4"
          @submit="handleSetMultiplier"
        >
          <UFormField label="New Multiplier" name="multiplier">
            <UInput
              v-model="formState.multiplier"
              type="text"
              inputmode="decimal"
              placeholder="Enter multiplier (e.g., 1.5)"
              class="w-full"
              data-test="multiplier-input"
              :disabled="isLoading"
            />
            <template #hint>
              <span v-if="!hasValidationError">
                Example: Multiplier of {{ displayMultiplierExample }} means 1 USDC =
                {{ displayMultiplierExample }} SHER
              </span>
            </template>
          </UFormField>

          <div class="modal-action flex justify-end gap-2">
            <UButton
              variant="ghost"
              type="button"
              :disabled="isLoading"
              data-test="cancel-button"
              @click="closeModal"
              label="Cancel"
            />
            <UButton
              color="primary"
              type="submit"
              :loading="isLoading"
              :disabled="!isMultiplierValid || isLoading"
              data-test="confirm-button"
              label="Update Multiplier"
            />
          </div>
        </UForm>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
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

const isModalOpen = ref(false)
const submissionError = ref<string | null>(null)

const formState = reactive({
  multiplier: '1'
})

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
  if (!formState.multiplier || formState.multiplier === '') return '1'
  return formatSherAmount(formState.multiplier, MULTIPLIER_DECIMALS)
})

const isReadLoading = computed(() => isMultiplierLoading.value || isOwnerLoading.value)
const isWriteLoading = computed(() => setMultiplierWrite.writeResult.isPending.value)
const isLoading = computed(() => isReadLoading.value || isWriteLoading.value)

const canManageMultiplier = computed(() => {
  if (!connection.isConnected.value || !connection.address?.value) return false
  if (!owner.value) return false
  return connection.address.value.toLowerCase() === (owner.value as string).toLowerCase()
})

const formSchema = z.object({
  multiplier: z
    .string()
    .trim()
    .min(1, 'Multiplier is required')
    .refine((value) => !isNaN(parseFloat(value)), 'Must be a valid number')
    .refine(
      (value) => parseFloat(value) >= MIN_MULTIPLIER,
      `Multiplier must be at least ${MIN_MULTIPLIER}`
    )
    .refine((value) => parseFloat(value) <= MAX_MULTIPLIER, 'Multiplier is too large')
})

type MultiplierFormSchema = z.output<typeof formSchema>

const schemaValidation = computed(() => formSchema.safeParse(formState))
const hasValidationError = computed(() => !schemaValidation.value.success)

const isMultiplierValid = computed(() => {
  if (!schemaValidation.value.success) return false

  const currentValue = parseFloat(formattedCurrentMultiplier.value)
  const newValue = parseFloat(schemaValidation.value.data.multiplier)

  return !isNaN(newValue) && newValue !== currentValue
})

watch(
  () => setMultiplierWrite.writeResult.error.value,
  (error) => {
    if (error) {
      console.error('Error setting multiplier:', error)
      const errorMessage = parseError(error)

      if (errorMessage.includes('User rejected') || errorMessage.includes('User denied')) {
        submissionError.value = 'Transaction cancelled by user'
        toast.add({ title: 'Transaction cancelled by user', color: 'error' })
      } else {
        submissionError.value = 'Failed to update multiplier'
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
        title: `Multiplier updated successfully to ${formatSherAmount(formState.multiplier, MULTIPLIER_DECIMALS)}x`,
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
      formState.multiplier = value
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
    formState.multiplier = formattedCurrentMultiplier.value
  }

  submissionError.value = null
  isModalOpen.value = true
}

function closeModal() {
  isModalOpen.value = false
}

async function handleSetMultiplier(event?: FormSubmitEvent<MultiplierFormSchema>) {
  submissionError.value = null

  if (!safeDepositRouterAddress.value) {
    submissionError.value = 'SafeDepositRouter address not found'
    toast.add({ title: 'SafeDepositRouter address not found', color: 'error' })
    return
  }

  if (!canManageMultiplier.value) {
    submissionError.value = 'Only the owner can set the multiplier'
    toast.add({ title: 'Only the owner can set the multiplier', color: 'error' })
    return
  }

  if (!isMultiplierValid.value) {
    submissionError.value = 'Please enter a valid multiplier'
    toast.add({ title: 'Please enter a valid multiplier', color: 'error' })
    return
  }

  const multiplierString = event?.data.multiplier ?? formState.multiplier

  try {
    const multiplierInWei = parseSafeDepositRouterMultiplier(multiplierString, MULTIPLIER_DECIMALS)

    if (multiplierInWei === 0n) {
      submissionError.value = 'Invalid multiplier format'
      toast.add({ title: 'Invalid multiplier format', color: 'error' })
      return
    }

    await setMultiplierWrite.executeWrite(multiplierInWei)
  } catch (error) {
    console.error('Error formatting multiplier:', error)
    submissionError.value = 'Invalid multiplier format'
    toast.add({ title: 'Invalid multiplier format', color: 'error' })
  }
}

defineExpose({ handleSetMultiplier })
</script>
