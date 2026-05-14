<template>
  <div class="flex flex-col gap-4">
    <div class="flex flex-col gap-6">
      <div v-for="(shareholder, index) in shareholderWithAmounts" :key="index">
        <UBadge color="primary" variant="solid">Shareholder {{ index + 1 }}</UBadge>
        <UFormField
          :name="`shareholders.${index}.shareholder`"
          label="Address"
          :error="rowErrors[index]?.shareholder"
          :ui="{ error: 'pl-4', root: 'mt-2' }"
          data-test="error-message-shareholder"
        >
          <UInput
            type="text"
            class="w-full"
            data-test="address-input"
            v-model="shareholder.shareholder"
            @keyup.stop="
              () => {
                searchUsers(shareholder.shareholder ?? '')
                showDropdown[index] = true
              }
            "
          />
        </UFormField>

        <div class="relative" :key="index" v-if="showDropdown[index]">
          <ul
            class="bg-default z-1 mt-1 flex w-96 flex-col gap-1 rounded-lg p-2 shadow-sm"
            v-if="!!usersData?.users && usersData?.users.length > 0"
          >
            <li
              v-for="user in usersData?.users"
              :key="user.address"
              class="hover:bg-muted rounded-md"
            >
              <a
                class="block cursor-pointer px-3 py-2"
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

        <UFormField
          :name="`shareholders.${index}.amount`"
          label="Amount"
          :error="rowErrors[index]?.amount"
          :ui="{ error: 'pl-4', root: 'mt-2' }"
          data-test="error-message-amount"
        >
          <UInput
            type="number"
            class="w-full"
            data-test="amount-input"
            :model-value="shareholder.amount"
            @update:model-value="(v: string | number) => (shareholder.amount = Number(v))"
          >
            <template #trailing>
              <span class="text-sm font-semibold text-gray-500 select-none">{{ tokenSymbol }}</span>
            </template>
          </UInput>
        </UFormField>
      </div>
    </div>

    <div class="flex justify-end pt-3">
      <div
        class="h-6 w-6 cursor-pointer"
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
        class="h-6 w-6 cursor-pointer"
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
        label="Distribute Mint"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useGetSearchUsersQuery } from '@/queries/user.queries'
import { log } from '@/utils'
import { Icon as IconifyIcon } from '@iconify/vue'
import { z } from 'zod'
import { parseUnits, isAddress } from 'viem'
import { ref, watch, reactive } from 'vue'

const toast = useToast()
const emits = defineEmits(['submit'])
defineProps<{
  tokenSymbol: string
  loading: boolean
}>()

const shareholderWithAmounts = reactive<{ shareholder: string; amount: number }[]>([
  { shareholder: '', amount: 0 }
])

const rowErrors = ref<{ shareholder?: string; amount?: string }[]>([{}])

const rowSchema = z.object({
  shareholder: z
    .string()
    .min(1, 'Address is required')
    .refine((v) => isAddress(v), 'Invalid address'),
  amount: z.number().refine((v) => v > 0, 'Amount must be greater than 0')
})

const onSubmit = () => {
  rowErrors.value = shareholderWithAmounts.map((item) => {
    const result = rowSchema.safeParse(item)
    if (result.success) return {}
    const errs: { shareholder?: string; amount?: string } = {}
    for (const issue of result.error.issues) {
      const field = issue.path[0] as 'shareholder' | 'amount'
      if (!errs[field]) errs[field] = issue.message
    }
    return errs
  })

  const hasErrors = rowErrors.value.some((e) => e.shareholder || e.amount)
  if (hasErrors) return

  emits(
    'submit',
    shareholderWithAmounts.map((shareholder) => ({
      shareholder: shareholder.shareholder,
      amount: parseUnits(shareholder.amount?.toString() ?? '0', 6)
    }))
  )
}

const search = ref('')
const showDropdown = ref<boolean[]>([false])

const { data: usersData, error: errorSearchUser } = useGetSearchUsersQuery({
  queryParams: { search, limit: 100 }
})

watch(errorSearchUser, (value) => {
  if (value) {
    log.error('Failed to search users', value)
    toast.add({ title: 'Failed to search users', color: 'error' })
  }
})

const searchUsers = async (input: string) => {
  if (input !== search.value && input.length > 0) {
    search.value = input
  }
}
</script>
