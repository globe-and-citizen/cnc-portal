<template>
  <template v-if="isOwner">
    <UButton
      color="primary"
      size="sm"
      variant="soft"
      icon="i-heroicons-plus"
      :disabled="addTokenSupport.isPending.value"
      @click="isOpen = true"
    >
      Add token
    </UButton>

    <UModal
      :open="isOpen"
      :prevent-close="addTokenSupport.isPending.value"
      title="Add supported token"
      :close="{ onClick: () => handleClose() }"
      class="max-w-lg mx-auto rounded-xl shadow-lg bg-white dark:bg-gray-900 p-0"
      @update:model-value="isOpen = $event"
    >
      <template #body>
        <div class="space-y-4">
          <p class="text-sm text-gray-600 dark:text-gray-400">
            Add an ERC20 token so fee-paying contracts can route it through the
            FeeCollector. Once supported, the token is swept to the beneficiary
            on the next <code>withdraw()</code>.
          </p>

          <UForm
            :schema="schema"
            :state="localState"
            class="space-y-4"
            @submit="handleSubmit"
          >
            <UFormField
              label="Token address"
              name="tokenAddress"
              class="flex-1"
            >
              <UInput
                v-model="localState.tokenAddress"
                placeholder="0x…"
                :disabled="addTokenSupport.isPending.value"
                class="w-full"
              />
            </UFormField>

            <div class="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800 mt-2">
              <UButton
                color="neutral"
                variant="outline"
                :disabled="addTokenSupport.isPending.value"
                type="button"
                @click="handleClose"
              >
                Cancel
              </UButton>
              <UButton
                color="primary"
                :disabled="addTokenSupport.isPending.value"
                :loading="addTokenSupport.isPending.value"
                type="submit"
              >
                Add token
              </UButton>
            </div>
          </UForm>

          <UAlert
            v-if="addTokenSupport.isError.value"
            color="error"
            variant="subtle"
            title="Failed to add token"
            :description="errorDescription"
            icon="i-lucide-terminal"
          />
        </div>
      </template>
    </UModal>
  </template>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { z } from 'zod'
import { isAddress, zeroAddress, type Address } from 'viem'
import { isFeeCollectorOwner, useFeeSupportedTokens } from '~/composables/FeeCollector/read'
import { useAddTokenSupport } from '~/composables/FeeCollector/writes'
import { parseErrorV2 } from '@/utils'

const isOwner = isFeeCollectorOwner()
const isOpen = ref(false)

const { data: supportedTokensData } = useFeeSupportedTokens()
const supportedTokensLower = computed<Set<string>>(() => {
  const list = supportedTokensData.value as readonly Address[] | undefined
  return new Set((list ?? []).map(addr => addr.toLowerCase()))
})

const addTokenSupport = useAddTokenSupport()

interface AddState {
  tokenAddress: string
}

const initialState = (): AddState => ({ tokenAddress: '' })
const localState = ref<AddState>(initialState())

// The "already supported" refinement reads the reactive set lazily so it
// stays in sync with `useFeeSupportedTokens` as the cache refreshes.
const schema = z.object({
  tokenAddress: z
    .string()
    .refine(v => isAddress(v), 'Must be a valid 0x address')
    .refine(v => v !== zeroAddress, 'Cannot add the zero address')
    .refine(
      v => !supportedTokensLower.value.has(v.toLowerCase()),
      'This token is already supported'
    )
})

const errorDescription = computed(() => {
  const err = addTokenSupport.error.value
  return err ? parseErrorV2(err) : ''
})

const handleClose = () => {
  if (addTokenSupport.isPending.value) return
  isOpen.value = false
}

const handleSubmit = async () => {
  if (addTokenSupport.isPending.value) return
  await addTokenSupport.mutateAsync({
    args: [localState.value.tokenAddress as Address]
  })
  // V3 auto-invalidates the fee collector's reads on success, so the
  // supported-tokens list and the TokenHoldings table refresh without any
  // manual refetch wiring.
  isOpen.value = false
}

watch(isOpen, (open) => {
  if (!open) return
  localState.value = initialState()
  addTokenSupport.reset()
})
</script>
