<template>
  <div class="flex flex-col gap-4">
    <h2>Distribute Mint</h2>

    <h3>Please input the amounts to mint to the shareholders</h3>
    <div class="flex flex-col gap-6">
      <div v-for="(shareholder, index) in shareholderWithAmounts" :key="index">
        <h4 class="badge badge-primary">Shareholder {{ index + 1 }}</h4>
        <label class="input input-bordered flex items-center gap-2 input-md mt-2 w-full">
          <p>Address</p>
          |
          <input
            type="text"
            class="grow"
            data-test="address-input"
            v-model="shareholder.shareholder"
            @keyup.stop="
              () => {
                searchUsers(shareholder.shareholder ?? '')
                showDropdown[index] = true
              }
            "
          />
        </label>

        <div
          class="dropdown"
          :class="{
            'dropdown-open':
              !!usersData?.users && usersData?.users.length > 0 && showDropdown[index]
          }"
          :key="index"
          v-if="showDropdown[index]"
        >
          <ul class="p-2 shadow menu dropdown-content z-[1] bg-base-100 rounded-box w-96">
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
          v-for="error of $v.shareholderWithAmounts.$errors[0]?.$response.$errors[index]
            .shareholder"
          data-test="error-message-shareholder"
          :key="error.$uid"
        >
          {{ error.$message }}
        </div>
        <label class="input input-bordered flex items-center gap-2 input-md mt-2 w-full">
          <p>Amount</p>
          |
          <input type="number" class="grow" data-test="amount-input" v-model="shareholder.amount" />
          {{ tokenSymbol }}
        </label>
        <div
          class="pl-4 text-red-500 text-sm w-full text-left"
          data-test="error-message-amount"
          v-for="error of $v.shareholderWithAmounts.$errors[0]?.$response.$errors[index].amount"
          :key="error.$uid"
        >
          {{ error.$message }}
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
      <ButtonUI
        :loading="loading"
        :disabled="loading"
        variant="primary"
        class="w-44 text-center"
        @click="onSubmit()"
        data-test="submit-button"
      >
        Distribute Mint
      </ButtonUI>
    </div>
  </div>
</template>

<script setup lang="ts">
import ButtonUI from '@/components/ButtonUI.vue'
import { useSearchUsersQuery } from '@/queries/user.queries'
import { useToastStore } from '@/stores'
import { log } from '@/utils'
import { Icon as IconifyIcon } from '@iconify/vue'
import useVuelidate from '@vuelidate/core'
import { helpers, numeric, required } from '@vuelidate/validators'
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
const rules = {
  shareholderWithAmounts: {
    $each: helpers.forEach({
      shareholder: {
        required: helpers.withMessage('Address is required', required),
        isAddress: helpers.withMessage('Invalid address', (value: string) => isAddress(value))
      },
      amount: {
        required: helpers.withMessage('Amount is required', required),
        numeric: helpers.withMessage('Amount must be a number', numeric),
        minValue: helpers.withMessage('Amount must be greater than 0', (value: number) => value > 0)
      }
    })
  }
}
const $v = useVuelidate(rules, { shareholderWithAmounts })
const onSubmit = () => {
  $v.value.$touch()

  if ($v.value.$invalid) return
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
const { data: usersData, error: errorSearchUser } = useSearchUsersQuery(search, 100)

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
