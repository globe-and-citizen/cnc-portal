<template>
  <div class="flex flex-col gap-4">
    <h2>Distribute Mint</h2>

    <h3>Please input the amounts to mint to the shareholders</h3>
    <div class="flex flex-col gap-6">
      <div v-for="(shareholder, index) in shareholderWithAmounts" :key="index">
        <h4 class="badge badge-primary">Shareholder {{ index + 1 }}</h4>
        <UFormField
          label="Address"
          :error="fieldErrors[index]?.shareholder"
          class="mt-2 w-full"
        >
          <UInput
            type="text"
            class="w-full"
            data-test="address-input"
            :model-value="shareholder.shareholder"
            @update:model-value="
              (val: string | number) => {
                shareholder.shareholder = String(val)
              }
            "
            @keyup.stop="
              () => {
                searchUsers(shareholder.shareholder ?? '')
                showDropdown[index] = true
              }
            "
          />
        </UFormField>

        <div
          class="dropdown"
          :class="{
            'dropdown-open':
              !!usersData?.users && usersData?.users.length > 0 && showDropdown[index]
          }"
          :key="index"
          v-if="showDropdown[index]"
        >
          <ul class="p-2 shadow-sm menu dropdown-content z-1 bg-base-100 rounded-box w-96">
            <li v-for="user in usersData?.users" :key="user.address">
              <a
                data-test="found-user"
                @click="
                  () => {
                    if (shareholderWithAmounts[index]) {
                      shareholderWithAmounts[index].shareholder = user.address ?? ''
                    }
                    showDropdown[index] = false
                  }
                "
              >
                {{ user.name }} | {{ user.address }}
              </a>
            </li>
          </ul>
        </div>
        <div
          class="pl-4 text-red-500 text-sm w-full text-left"
          v-if="fieldErrors[index]?.shareholder"
          data-test="error-message-shareholder"
        >
          {{ fieldErrors[index].shareholder }}
        </div>
        <UFormField
          label="Amount"
          :error="fieldErrors[index]?.amount"
          class="mt-2 w-full"
        >
          <div class="relative">
            <UInput
              type="number"
              class="w-full"
              data-test="amount-input"
              :model-value="shareholder.amount"
              @update:model-value="
                (val: string | number) => {
                  shareholder.amount = Number(val)
                }
              "
            />
            <span
              class="absolute right-4 top-1/2 transform -translate-y-1/2 text-black font-bold text-sm"
            >
              {{ tokenSymbol }}
            </span>
          </div>
        </UFormField>
        <div
          class="pl-4 text-red-500 text-sm w-full text-left"
          data-test="error-message-amount"
          v-if="fieldErrors[index]?.amount"
        >
          {{ fieldErrors[index].amount }}
        </div>
      </div>
    </div>

    <div class="flex justify-end pt-3">
      <div
        class="w-6 h-6 cursor-pointer"
        @click="
          () => {
            shareholderWithAmounts.push({ shareholder: '', amount: 0 })
            showDropdown.push(false)
          }
        "
        data-test="plus-icon"
      >
        <IconifyIcon icon="heroicons-outline:plus-circle" class="size-6 text-green-700" />
      </div>
      <div
        class="w-6 h-6 cursor-pointer"
        @click="
          () => {
            shareholderWithAmounts.length > 1 && shareholderWithAmounts.pop()
            showDropdown = showDropdown.slice(0, showDropdown.length - 1)
          }
        "
        data-test="minus-icon"
      >
        <IconifyIcon icon="heroicons-outline:minus-circle" class="size-6 text-red-700" />
      </div>
    </div>

    <div class="text-center">
      <UButton
        :loading="loading"
        :disabled="loading"
        color="primary"
        class="w-44 text-center"
        @click="onSubmit()"
        data-test="submit-button"
      >
        Distribute Mint
      </UButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { z } from 'zod'
import { useGetSearchUsersQuery } from '@/queries/user.queries'
import { useToastStore } from '@/stores'
import { log } from '@/utils'
import { Icon as IconifyIcon } from '@iconify/vue'
import { parseUnits, isAddress } from 'viem'
import { ref, watch } from 'vue'
import { reactive } from 'vue'

const { addErrorToast } = useToastStore()
const emits = defineEmits(['submit'])
defineProps<{
  tokenSymbol: string
  loading: boolean
}>()
const shareholderWithAmounts = reactive<{ shareholder: string; amount: number }[]>([
  { shareholder: '', amount: 0 }
])

const shareholderSchema = z.object({
  shareholder: z
    .string({ message: 'Address is required' })
    .min(1, 'Address is required')
    .refine((val) => isAddress(val), { message: 'Invalid address' }),
  amount: z.coerce
    .number({ message: 'Amount is required' })
    .positive('Amount must be greater than 0')
})
const formSchema = z.array(shareholderSchema)

const fieldErrors = reactive<Record<number, { shareholder?: string; amount?: string }>>({})

const validate = () => {
  const result = formSchema.safeParse(shareholderWithAmounts)
  // Clear previous errors
  Object.keys(fieldErrors).forEach((key) => delete fieldErrors[Number(key)])

  if (result.success) return true

  for (const issue of result.error.issues) {
    const index = issue.path[0] as number
    const field = issue.path[1] as 'shareholder' | 'amount'
    if (!fieldErrors[index]) fieldErrors[index] = {}
    if (!fieldErrors[index][field]) {
      fieldErrors[index][field] = issue.message
    }
  }
  return false
}

const onSubmit = () => {
  if (!validate()) return
  emits(
    'submit',
    shareholderWithAmounts.map((shareholder) => {
      return {
        shareholder: shareholder.shareholder,
        amount: parseUnits(shareholder.amount?.toString() ?? '0', 6)
      }
    })
  )
}

const search = ref('')
const showDropdown = ref<boolean[]>([false])

// Use TanStack Query for user search
const { data: usersData, error: errorSearchUser } = useGetSearchUsersQuery({
  queryParams: { search, limit: 100 }
})

watch(errorSearchUser, (value) => {
  if (value) {
    log.error('Failed to search users', value)
    addErrorToast('Failed to search users')
  }
})

const searchUsers = async (input: string) => {
  if (input !== search.value && input.length > 0) {
    search.value = input
  }
  // TanStack Query automatically refetches when the `search` ref changes
}
</script>
