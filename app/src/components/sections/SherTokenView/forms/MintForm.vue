<template>
  <UForm :schema="schema" :state="state" @submit="onSubmit">
    <div class="flex flex-col gap-6">
      <UFormField name="address" label="Recipient">
        <SelectMemberContractsInput
          :modelValue="memberInputInternal"
          @update:modelValue="handleMemberInput"
          data-test="address-input"
          :disabled="props.disabled"
        />
      </UFormField>

      <div class="space-y-3">
        <p class="text-sm font-semibold text-gray-900">Stake mode</p>
        <div class="grid grid-cols-2 rounded-xl border border-gray-200 bg-gray-100 p-1">
          <UButton
            size="sm"
            :color="state.stakeMode === 'add' ? 'primary' : 'neutral'"
            :variant="state.stakeMode === 'add' ? 'solid' : 'ghost'"
            class="justify-center rounded-lg font-semibold"
            data-test="add-mode-button"
            @click="setStakeMode('add')"
            label="Add %"
          />
          <UButton
            size="sm"
            :color="state.stakeMode === 'ending' ? 'primary' : 'neutral'"
            :variant="state.stakeMode === 'ending' ? 'solid' : 'ghost'"
            class="justify-center rounded-lg font-semibold"
            data-test="ending-mode-button"
            @click="setStakeMode('ending')"
            :label="state.stakeMode === 'ending' ? 'Ending % ✓' : 'Ending %'"
          />
        </div>
      </div>

      <UFormField name="amount" label="Ownership stake">
        <div class="flex flex-col gap-2">
          <div class="flex items-center justify-end">
            <span class="text-xs text-gray-500">Both fields stay in sync.</span>
          </div>

          <div class="flex items-center gap-2 md:gap-3">
            <UInput
              class="flex-1"
              data-test="percentage-input"
              v-model="state.percentage"
              placeholder="0"
              @update:modelValue="onPercentageChange"
            >
              <template #trailing>
                <span class="text-sm font-semibold text-gray-500 select-none">%</span>
              </template>
            </UInput>

            <UIcon name="i-lucide-equal" class="size-5 shrink-0 text-gray-400" />

            <UInput
              class="flex-1"
              data-test="amount-input"
              v-model="state.amount"
              placeholder="0"
              @update:modelValue="onAmountChange"
            >
              <template #trailing>
                <span class="text-sm font-semibold text-gray-500 select-none">{{
                  tokenSymbol
                }}</span>
              </template>
            </UInput>
          </div>

          <p v-if="totalSupplyDisplay !== null" class="text-xs text-gray-500">
            Current supply:
            <span class="font-semibold">{{ totalSupplyDisplay }} {{ tokenSymbol }}</span>
            <span v-if="totalSupplyDisplay === '0'" class="ml-1 text-amber-500"
              >— issue a fixed amount first before using percentage mode</span
            >
          </p>
          <p
            v-if="endingStakeValidationMessage"
            class="text-xs text-amber-600"
            data-test="ending-stake-validation-message"
          >
            {{ endingStakeValidationMessage }}
          </p>

          <div
            v-if="showRecap"
            class="rounded-xl border border-blue-200 bg-blue-50 p-4"
            data-test="recap-card"
          >
            <div class="mb-2 flex items-center gap-2 text-sm font-semibold text-blue-700">
              <UIcon name="i-lucide-info" class="size-4" />
              <span>Recap</span>
            </div>
            <div class="space-y-1.5 text-sm text-blue-900">
              <p v-if="recapIssuedLine" data-test="allocation-recap">{{ recapIssuedLine }}</p>
              <p v-if="recapStakeLine" data-test="recap-stake-line">{{ recapStakeLine }}</p>
              <p v-if="recapTokenStakeLine" data-test="recap-token-stake-line">
                {{ recapTokenStakeLine }}
              </p>
              <p v-if="recapSupplyLine" data-test="new-total-supply-recap">
                {{ recapSupplyLine }}
              </p>
            </div>
          </div>
        </div>
      </UFormField>

      <UAlert
        v-if="mintErrorMessage"
        color="error"
        variant="soft"
        icon="i-lucide-circle-alert"
        :title="mintErrorMessage"
      />

      <div class="flex justify-between gap-4 text-center" data-test="form-actions">
        <UButton
          variant="outline"
          color="error"
          data-test="cancel-button"
          :disabled="isConfirmingMint || isMintPending"
          @click="emit('close-modal')"
          label="Cancel"
        />
        <UButton
          type="submit"
          :loading="isConfirmingMint || isMintPending"
          :disabled="isConfirmingMint || isMintPending || isEndingStakeInvalid"
          color="primary"
          class="text-center"
          data-test="submit-button"
          label="Issue tokens"
        />
      </div>
    </div>
  </UForm>
</template>

<script setup lang="ts">
import { z } from 'zod'
import { isAddress, parseUnits, type Address } from 'viem'
import { onMounted, reactive, ref, computed } from 'vue'
import { useReadContract, useWaitForTransactionReceipt, useWriteContract } from '@wagmi/vue'
import SelectMemberContractsInput from '@/components/utils/SelectMemberContractsInput.vue'
import { INVESTOR_ABI } from '@/artifacts/abi/investors'
import { watch } from 'vue'
import { useTeamStore } from '@/stores'
import { log } from '@/utils'
import { useQueryClient } from '@tanstack/vue-query'
import { useMintStakeAllocation } from '@/composables/investor/useMintStakeAllocation'
import { type StakeMode } from '@/types/investor'

const TOKEN_DECIMALS = 6

const memberInputInternal = ref<{ name: string; address: string }>({ name: '', address: '' })
const state = reactive({
  address: '',
  amount: '',
  percentage: '',
  stakeMode: 'ending' as StakeMode
})
const mintErrorMessage = ref<string | null>(null)
const mintHash = ref<`0x${string}` | undefined>()
const emit = defineEmits(['close-modal'])

const mintModal = defineModel({ default: false })

const props = defineProps<{
  memberInput?: { name: string; address: string }
  disabled?: boolean
}>()

const queryClient = useQueryClient()
const teamStore = useTeamStore()
const toast = useToast()

const investorsAddress = computed(() => teamStore.getContractAddressByType('InvestorV1'))

const schema = z.object({
  address: z.string().refine((v) => isAddress(v), { message: 'Invalid address' }),
  amount: z
    .string()
    .min(1, 'Enter an amount or a percentage')
    .refine((v) => !isNaN(Number(v)) && Number(v) > 0, { message: 'Amount must be greater than 0' })
})

const { mutateAsync: mint, isPending: isMintPending } = useWriteContract()

const { isLoading: isConfirmingMint, isSuccess: isSuccessMinting } = useWaitForTransactionReceipt({
  hash: mintHash
})

const { data: tokenSymbol } = useReadContract({
  abi: INVESTOR_ABI,
  address: investorsAddress,
  functionName: 'symbol'
})

const { data: totalSupplyRaw } = useReadContract({
  abi: INVESTOR_ABI,
  address: investorsAddress,
  functionName: 'totalSupply'
})

const { data: recipientBalanceRaw } = useReadContract({
  abi: INVESTOR_ABI,
  address: investorsAddress,
  functionName: 'balanceOf',
  args: computed(() => [state.address as Address]),
  query: {
    enabled: computed(
      () =>
        !!investorsAddress.value && isAddress(investorsAddress.value) && isAddress(state.address)
    )
  }
})

const totalSupplyValue = computed(() =>
  typeof totalSupplyRaw.value === 'bigint' ? totalSupplyRaw.value : undefined
)
const recipientBalanceValue = computed(() =>
  typeof recipientBalanceRaw.value === 'bigint' ? recipientBalanceRaw.value : undefined
)
const tokenSymbolValue = computed(() =>
  typeof tokenSymbol.value === 'string' ? tokenSymbol.value : undefined
)
const isRecipientAddressValid = computed(() => isAddress(state.address))

const {
  totalSupplyDisplay,
  onPercentageChange,
  onAmountChange,
  setStakeMode,
  isEndingStakeInvalid,
  endingStakeValidationMessage,
  recapIssuedLine,
  recapStakeLine,
  recapTokenStakeLine,
  recapSupplyLine,
  showRecap,
  issuedAmount
} = useMintStakeAllocation(
  state,
  totalSupplyValue,
  recipientBalanceValue,
  tokenSymbolValue,
  isRecipientAddressValid
)

const handleMemberInput = (v: { name: string; address: string }) => {
  memberInputInternal.value = v
  state.address = v.address
}

const onSubmit = async () => {
  if (isEndingStakeInvalid.value) return
  if (issuedAmount.value === null || issuedAmount.value <= 0) return

  mintErrorMessage.value = null
  await mint(
    {
      abi: INVESTOR_ABI,
      address: investorsAddress.value as Address,
      functionName: 'individualMint',
      args: [state.address as Address, parseUnits(String(issuedAmount.value), TOKEN_DECIMALS)]
    },
    {
      onSuccess: (hash) => {
        mintHash.value = hash
      },
      onError: (error) => {
        log.error('Failed to mint', error)
        mintErrorMessage.value =
          (error as { shortMessage?: string }).shortMessage ??
          error.message ??
          'Transaction failed. Please try again.'
      }
    }
  )
}

onMounted(() => {
  if (props.memberInput) {
    memberInputInternal.value = props.memberInput
    state.address = props.memberInput.address
  }
})

watch(isConfirmingMint, async (isConfirming, wasConfirming) => {
  if (wasConfirming && !isConfirming && isSuccessMinting.value) {
    toast.add({ title: 'Tokens issued successfully', color: 'success' })
    await queryClient.invalidateQueries({ queryKey: ['readContract'] })
    mintModal.value = false
    emit('close-modal')
  }
})
</script>
