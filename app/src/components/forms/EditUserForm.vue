<template>
  <UForm
    :schema="userSchema"
    :state="userCopy"
    class="flex flex-col gap-5 overflow-hidden"
    data-test="edit-user-modal"
    @submit="submitForm"
  >
    <!-- Wallet Address -->
    <UAlert
      color="neutral"
      variant="soft"
      icon="i-heroicons-wallet"
      title="Wallet Address"
      class="mb-2"
    >
      <template #description>
        <div class="flex items-center gap-2">
          <UTooltip text="Click to see address in block explorer">
            <span
              class="cursor-pointer hover:text-primary transition-colors"
              @click="openExplorer(userStore.address)"
              data-test="user-address"
            >
              {{ userStore.address }}
            </span>
          </UTooltip>
          <UTooltip :text="copied ? 'Copied!' : 'Click to copy address'">
            <UButton
              v-if="isSupported && !copied"
              icon="i-heroicons-clipboard-document"
              color="neutral"
              variant="ghost"
              size="xs"
              square
              data-test="copy-address-icon"
              @click="copy(userStore.address)"
            />
            <UButton
              v-if="copied"
              icon="i-heroicons-check"
              color="success"
              variant="ghost"
              size="xs"
              square
              data-test="copied-icon"
            />
          </UTooltip>
        </div>
      </template>
    </UAlert>

    <!-- Input Name -->
    <UFormField label="Name" name="name" required class="w-full">
      <UInput
        v-model="userCopy.name"
        type="text"
        placeholder="John Doe"
        data-test="name-input"
        size="xl"
        class="w-full"
      />
    </UFormField>

    <!-- Currency -->
    <UFormField label="Default Currency" name="currency" class="w-full">
      <USelect
        v-if="LIST_CURRENCIES && LIST_CURRENCIES.length"
        v-model="selectedCurrency"
        :items="currencyOptions"
        @change="handleCurrencyChange"
        data-test="currency-select"
        size="xl"
        class="w-full"
      />
    </UFormField>

    <!-- Upload -->
    <ProfileImageUpload
      :model-value="userCopy.imageUrl"
      @update:model-value="($event) => (userCopy.imageUrl = $event)"
    />

    <!-- Error Alert -->
    <UAlert
      v-if="userUpdateError"
      color="error"
      variant="soft"
      icon="i-heroicons-x-circle"
      title="Failed to update user"
      description="An error occurred while updating your profile. Please try again."
      data-test="error-alert"
    />

    <!-- Submit Button -->
    <div class="flex justify-end gap-2">
      <UButton
        v-if="hasChanges"
        color="primary"
        type="submit"
        :loading="userIsUpdating"
        :disabled="userIsUpdating"
        data-test="submit-edit-user"
      >
        Save Changes
      </UButton>
    </div>
  </UForm>
</template>

<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import { useCurrencyStore, useToastStore, useUserDataStore } from '@/stores'
import { LIST_CURRENCIES } from '@/constant'
import { useClipboard } from '@vueuse/core'
import { NETWORK } from '@/constant'
import { ref, computed, reactive } from 'vue'
import ProfileImageUpload from '@/components/forms/ProfileImageUpload.vue'
import { useUpdateUserMutation } from '@/queries/user.queries'

// Stores
const currencyStore = useCurrencyStore()
const toastStore = useToastStore()
const userStore = useUserDataStore()
const selectedCurrency = ref<string>(currencyStore.localCurrency?.code)

// Zod validation schema
const userSchema = z.object({
  name: z
    .string({ message: 'Name is required' })
    .min(3, 'Name must be at least 3 characters')
    .max(100, 'Name cannot exceed 100 characters'),
  imageUrl: z.string().optional()
})

type UserSchema = z.output<typeof userSchema>

// Form state
const userCopy = reactive<Partial<UserSchema>>({
  name: userStore.name,
  imageUrl: userStore.imageUrl
})

// Currency options for USelect
const currencyOptions = computed(() =>
  LIST_CURRENCIES.map((currency) => ({
    label: currency.code,
    value: currency.code
  }))
)

// Computed property to check if name or image has changed
const hasChanges = computed(() => {
  return userCopy.name !== userStore.name || userCopy.imageUrl !== userStore.imageUrl
})

const {
  mutateAsync: updateUser,
  isPending: userIsUpdating,
  isError: userUpdateError
} = useUpdateUserMutation()

const submitForm = async (event: FormSubmitEvent<UserSchema>) => {
  try {
    const updatedUser = await updateUser({
      pathParams: { address: userStore.address! },
      body: {
        name: event.data.name,
        imageUrl: event.data.imageUrl
      }
    })

    if (updatedUser) {
      toastStore.addSuccessToast('User updated')
      userStore.setUserData(
        updatedUser.name ?? '',
        (updatedUser.address ?? '') as `0x${string}`,
        String(updatedUser.nonce ?? ''),
        updatedUser.imageUrl ?? ''
      )
      setTimeout(() => {
        toastStore.addSuccessToast('Reloading page to reflect changes')
        window.location.reload()
      }, 2000)
    }
  } catch {
    toastStore.addErrorToast('Failed to update user')
  }
}

// Clipboard
const { copy, copied, isSupported } = useClipboard()

// Explorer
const openExplorer = (address: string) => {
  window.open(`${NETWORK.blockExplorerUrl}/address/${address}`, '_blank')
}

const handleCurrencyChange = () => {
  currencyStore.setCurrency(selectedCurrency.value)
  toastStore.addSuccessToast('Currency updated')
}
</script>
