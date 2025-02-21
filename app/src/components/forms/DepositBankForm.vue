<template>
  <span class="font-bold text-2xl">Deposit to Team Bank Contract</span>
  <label class="form-control w-full mt-4">
    <div class="label">
      <span class="label-text">Deposit</span>
    </div>
    <div class="input input-lg input-bordered flex items-center">
      <input type="text" class="grow" placeholder="0" v-model="amount" data-test="amountInput" />

      <div>
        <div
          role="button"
          class="flex items-center cursor-pointer gap-4 badge badge-lg badge-info"
          @click="
            () => {
              isDropdownOpen = !isDropdownOpen
              console.log(`Dropdown open: ${isDropdownOpen}`)
            }
          "
        >
          <span class="">{{ tokenList[selectedTokenId].name }} </span>
          <ChevronDownIcon class="w-4 h-4" />
        </div>
        <ul
          class="absolute right-0 mt-2 menu bg-base-200 border-2 rounded-box z-[1] w-52 p-2 shadow"
          ref="target"
          v-if="isDropdownOpen"
        >
          <li
            v-for="(token, id) in tokenList"
            :key="id"
            @click="
              () => {
                selectedTokenId = id
                isDropdownOpen = false
              }
            "
          >
            <a>{{ token.name }}</a>
          </li>
        </ul>
      </div>
    </div>
    <div class="label">
      <!-- Estimated Price in USD -->
      <span class="label-text">$122</span>
      <div class="pl-4 text-red-500 text-sm" v-for="error in $v.amount.$errors" :key="error.$uid">
        {{ error.$message }}
      </div>
    </div>
  </label>

  <div class="modal-action justify-center">
    <ButtonUI
      variant="primary"
      @click="submitForm"
      :loading="props.loading"
      :disabled="props.loading"
    >
      <template v-if="props.loading">
        {{ props.loadingText }}
      </template>
      <template v-else> Deposit </template>
    </ButtonUI>
    <ButtonUI variant="error" outline @click="$emit('closeModal')">Cancel</ButtonUI>
  </div>
</template>

<script setup lang="ts">
import { NETWORK } from '@/constant'
import { ref, onMounted } from 'vue'
import { required, numeric, helpers } from '@vuelidate/validators'
import { useVuelidate } from '@vuelidate/core'
import ButtonUI from '../ButtonUI.vue'
import { ChevronDownIcon } from '@heroicons/vue/24/outline'
import { onClickOutside } from '@vueuse/core'

const props = defineProps<{
  loading?: boolean
  loadingText?: string
}>()

const amount = ref<string>('')
const selectedTokenId = ref(0)
const isDropdownOpen = ref<boolean>(false)

const tokenList = [
  { name: NETWORK.currencySymbol, symbol: 'ETH' },
  { name: 'USDC', symbol: 'USDC' }
]

const emits = defineEmits(['deposit', 'closeModal'])

const target = ref<HTMLElement | null>(null)
onMounted(() => {
  onClickOutside(target, () => {
    isDropdownOpen.value = false
  })
})

const notZero = helpers.withMessage('Amount must be greater than 0', (value: string) => {
  return parseFloat(value) > 0
})

const rules = {
  amount: {
    required,
    numeric,
    notZero
  }
}

const $v = useVuelidate(rules, { amount })

const submitForm = async () => {
  await $v.value.$touch()
  if ($v.value.$invalid) return
  emits('deposit', {
    amount: amount.value,
    token: tokenList[selectedTokenId.value].symbol
  })
}
</script>
