<template>
  <UForm :schema="schema" :state="state" @submit="onSubmit">
    <div class="flex flex-col gap-4">
      <UFormField name="address" label="Recipient">
        <SelectMemberContractsInput
          :modelValue="memberInputInternal"
          @update:modelValue="handleMemberInput"
          data-test="address-input"
          :disabled="props.disabled"
        />
      </UFormField>

      <UFormField name="amount" label="Ownership stake" hint="Both fields stay in sync.">
        <div class="flex flex-col gap-2">
          <div class="inline-flex w-fit items-center gap-2 rounded-lg border border-gray-200 p-1">
            <UButton
              size="xs"
              :color="state.stakeMode === 'ending' ? 'primary' : 'neutral'"
              :variant="state.stakeMode === 'ending' ? 'solid' : 'ghost'"
              data-test="ending-mode-button"
              @click="setStakeMode('ending')"
              label="Ending %"
            />
            <UButton
              size="xs"
              :color="state.stakeMode === 'add' ? 'primary' : 'neutral'"
              :variant="state.stakeMode === 'add' ? 'solid' : 'ghost'"
              data-test="add-mode-button"
              @click="setStakeMode('add')"
              label="Add %"
            />
          </div>

          <div class="flex items-center gap-2">
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

            <UIcon name="i-lucide-equal" class="size-4 shrink-0 text-gray-400" />

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

          <p v-if="allocationRecap" class="text-xs text-gray-500" data-test="allocation-recap">
            {{ allocationRecap }}
          </p>
          <p
            v-if="newTotalSupplyRecap"
            class="text-xs text-gray-500"
            data-test="new-total-supply-recap"
          >
            {{ newTotalSupplyRecap }}
          </p>
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
          :disabled="isConfirmingMint || isMintPending"
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
  args: [computed(() => state.address as Address)],
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

const {
  totalSupplyDisplay,
  onPercentageChange,
  onAmountChange,
  setStakeMode,
  endingStakeValidationMessage,
  allocationRecap,
  newTotalSupplyRecap
} = useMintStakeAllocation(state, totalSupplyValue, recipientBalanceValue, tokenSymbolValue)

const handleMemberInput = (v: { name: string; address: string }) => {
  memberInputInternal.value = v
  state.address = v.address
}

const onSubmit = async () => {
  mintErrorMessage.value = null
  await mint(
    {
      abi: INVESTOR_ABI,
      address: investorsAddress.value as Address,
      functionName: 'individualMint',
      args: [state.address as Address, parseUnits(state.amount, TOKEN_DECIMALS)]
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
