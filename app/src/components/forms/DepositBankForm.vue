<template>
  <span class="font-bold text-2xl">Deposit to Team Bank Contract</span>
  <label class="form-control w-full mt-4">
    <div class="label">
      <span class="label-text">Deposit</span>
      <span class="label-text-alt">Balance: {{ formattedBalance }}</span>
    </div>
    <div class="input input-lg input-bordered flex items-center">
      <input
        type="text"
        class="grow"
        placeholder="0"
        v-model="amount"
        data-test="amountInput"
        @input="handleAmountInput"
      />
      <button class="btn btn-sm btn-ghost mr-2" @click="useMaxBalance" :disabled="isLoadingBalance">
        Max
      </button>
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
          <IconifyIcon icon="heroicons-outline:chevron-down" class="w-4 h-4" />
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
      <!-- Estimated Price in selected currency -->
      <span class="label-text" v-if="amount && parseFloat(amount) > 0">
        ≈ {{ estimatedPrice }}
      </span>
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
      :disabled="props.loading || $v.amount.$invalid"
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
import { NETWORK, USDC_ADDRESS } from '@/constant'
import { ref, onMounted, computed, watch } from 'vue'
import { required, numeric, helpers } from '@vuelidate/validators'
import { useVuelidate } from '@vuelidate/core'
import ButtonUI from '../ButtonUI.vue'
import { Icon as IconifyIcon } from '@iconify/vue'
import { onClickOutside } from '@vueuse/core'
import { useCurrencyStore } from '@/stores/currencyStore'
import { useBalance, useChainId, useReadContract } from '@wagmi/vue'
import { useUserDataStore } from '@/stores/user'
import { formatEther, type Address } from 'viem'
import ERC20ABI from '@/artifacts/abi/erc20.json'

const props = defineProps<{
  loading?: boolean
  loadingText?: string
}>()

const amount = ref<string>('')
const selectedTokenId = ref(0)
const isDropdownOpen = ref<boolean>(false)
const currencyStore = useCurrencyStore()
const userDataStore = useUserDataStore()
const chainId = useChainId()

watch(amount, () => {
  $v.value.$touch()
})

const { data: nativeBalance, isLoading: isLoadingNativeBalance } = useBalance({
  address: userDataStore.address as Address,
  chainId
})

const { data: usdcBalance, isLoading: isLoadingUsdcBalance } = useReadContract({
  address: USDC_ADDRESS as Address,
  abi: ERC20ABI,
  functionName: 'balanceOf',
  args: [userDataStore.address as Address]
})

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
  // Fetch the current price when component mounts
  currencyStore.fetchNativeTokenPrice()
})

const formattedBalance = computed(() => {
  if (selectedTokenId.value === 0) {
    return nativeBalance.value ? Number(formatEther(nativeBalance.value.value)).toFixed(4) : '0.00'
  }
  return usdcBalance.value ? (Number(usdcBalance.value) / 1e6).toFixed(4) : '0.00'
})

const isLoadingBalance = computed(() => isLoadingNativeBalance.value || isLoadingUsdcBalance.value)

const useMaxBalance = () => {
  amount.value = formattedBalance.value
}

const notZero = helpers.withMessage('Amount must be greater than 0', (value: string) => {
  return parseFloat(value) > 0
})

const notExceedingBalance = helpers.withMessage('Amount exceeds your balance', (value: string) => {
  if (!value || parseFloat(value) <= 0) return true
  return parseFloat(value) <= parseFloat(formattedBalance.value)
})

const validDecimals = helpers.withMessage(
  'Amount must have at most 4 decimal places',
  (value: string) => {
    if (!value) return true
    const parts = value.split('.')
    return parts.length === 1 || parts[1].length <= 4
  }
)

const rules = {
  amount: {
    required,
    numeric,
    notZero,
    notExceedingBalance,
    validDecimals
  }
}

const $v = useVuelidate(rules, { amount })

const estimatedPrice = computed(() => {
  const amountValue = parseFloat(amount.value)
  if (isNaN(amountValue) || amountValue <= 0) return 0

  if (selectedTokenId.value === 0) {
    return Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyStore.currency.code,
      minimumFractionDigits: 2
    }).format((currencyStore.nativeTokenPrice || 0) * amountValue)
  }

  return Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyStore.currency.code,
    minimumFractionDigits: 2
  }).format((currencyStore.usdPriceInLocal || 0) * amountValue)
})

const submitForm = async () => {
  await $v.value.$touch()
  if ($v.value.$invalid) return
  emits('deposit', {
    amount: amount.value,
    token: tokenList[selectedTokenId.value].symbol
  })
}

const handleAmountInput = (event: Event) => {
  const input = event.target as HTMLInputElement
  const value = input.value.replace(/[^\d.]/g, '')
  const parts = value.split('.')
  if (parts.length > 2) {
    amount.value = parts[0] + '.' + parts.slice(1).join('')
  } else {
    amount.value = value
  }
}
</script>
