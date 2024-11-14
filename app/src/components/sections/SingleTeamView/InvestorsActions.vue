<template>
  <div class="flex flex-col justify-around gap-2 w-full">
    <h2>Owner Interaction</h2>
    <div class="flex justify-end gap-2 w-full">
      <button
        class="btn btn-primary gap-1"
        :disabled="!tokenSymbol"
        @click="distributeMintModal = true"
      >
        Distribute Mint {{ tokenSymbol }}
      </button>
      <button class="btn btn-primary" @click="payDividendsModal = true">Pay Dividends</button>
      <button class="btn btn-primary gap-1" :disabled="!tokenSymbol" @click="mintModal = true">
        Mint {{ tokenSymbol }}
      </button>
    </div>
    <ModalComponent v-model="mintModal">
      <MintForm
        v-if="mintModal"
        :loading="mintLoading || isConfirmingMint"
        :token-symbol="tokenSymbol!"
        @submit="(address: Address, amount: string) => mintToken(address, amount)"
      ></MintForm>
    </ModalComponent>
    <ModalComponent v-model="distributeMintModal">
      <DistributeMintForm
        v-if="distributeMintModal"
        :loading="distributeMintLoading || isConfirmingDistributeMint"
        :shareholders="shareholders"
        :token-symbol="tokenSymbol!"
        @submit="
          (shareholders: ReadonlyArray<{ shareholder: Address; amount: bigint }>) =>
            executeDistributeMint(shareholders)
        "
      ></DistributeMintForm>
    </ModalComponent>
    <ModalComponent v-model="payDividendsModal">
      <PayDividendsForm
        v-if="payDividendsModal"
        :loading="payDividendsLoading || isConfirmingPayDividends"
        :token-symbol="tokenSymbol!"
        @submit="executePayDividends"
      ></PayDividendsForm>
    </ModalComponent>
  </div>
</template>
<script setup lang="ts">
import { INVESTOR_ABI } from '@/artifacts/abi/investorsV1'
import ModalComponent from '@/components/ModalComponent.vue'
import { useToastStore } from '@/stores'
import type { Team } from '@/types'
import { log } from '@/utils'
import { useSendTransaction, useWaitForTransactionReceipt, useWriteContract } from '@wagmi/vue'
import { parseEther, type Address } from 'viem'
import { ref, watch } from 'vue'
import MintForm from '@/components/sections/SingleTeamView/forms/MintForm.vue'
import DistributeMintForm from '@/components/sections/SingleTeamView/forms/DistributeMintForm.vue'
import PayDividendsForm from '@/components/sections/SingleTeamView/forms/PayDividendsForm.vue'

const { addErrorToast, addSuccessToast } = useToastStore()
const mintModal = ref(false)
const distributeMintModal = ref(false)
const payDividendsModal = ref(false)
const emits = defineEmits(['refetchShareholders'])

const props = defineProps<{
  team: Team
  tokenSymbol: string | undefined
  tokenSymbolLoading: boolean
  shareholders: ReadonlyArray<{ shareholder: Address; amount: bigint }> | undefined
}>()

const {
  data: mintHash,
  writeContract: mint,
  isPending: mintLoading,
  error: mintError
} = useWriteContract()
const { isLoading: isConfirmingMint, isSuccess: isSuccessMinting } = useWaitForTransactionReceipt({
  hash: mintHash
})

const {
  data: distributeMintHash,
  writeContract: distributeMint,
  isPending: distributeMintLoading,
  error: distributeMintError
} = useWriteContract()

const { isLoading: isConfirmingDistributeMint, isSuccess: isSuccessDistributingMint } =
  useWaitForTransactionReceipt({
    hash: distributeMintHash
  })

const {
  data: payDividendsHash,
  sendTransaction: payDividends,
  isPending: payDividendsLoading,
  error: payDividendsError
} = useSendTransaction()

const { isLoading: isConfirmingPayDividends, isSuccess: isSuccessPayDividends } =
  useWaitForTransactionReceipt({
    hash: payDividendsHash
  })

const executePayDividends = (value: bigint) => {
  payDividends({
    value,
    to: props.team.investorsAddress as Address
  })
}
const executeDistributeMint = (
  shareholders: ReadonlyArray<{
    readonly shareholder: Address
    readonly amount: bigint
  }>
) => {
  distributeMint({
    abi: INVESTOR_ABI,
    address: props.team.investorsAddress as Address,
    functionName: 'distributeMint',
    args: [shareholders]
  })
}

const mintToken = (address: Address, amount: string) => {
  mint({
    abi: INVESTOR_ABI,
    address: props.team.investorsAddress as Address,
    functionName: 'individualMint',
    args: [address, parseEther(amount)]
  })
}

watch(distributeMintError, () => {
  if (distributeMintError.value) {
    log.error('Failed to distribute mint', distributeMintError.value)
    addErrorToast('Failed to distribute mint')
  }
})

watch(mintError, (value) => {
  if (value) {
    log.error('Failed to mint', value)
    addErrorToast('Failed to mint')
  }
})

watch(payDividendsError, () => {
  if (payDividendsError.value) {
    log.error('Failed to pay dividends', payDividendsError.value)
    addErrorToast('Failed to pay dividends')
  }
})

watch(isConfirmingMint, (isConfirming, wasConfirming) => {
  if (wasConfirming && !isConfirming && isSuccessMinting.value) {
    emits('refetchShareholders')
    addSuccessToast('Minted successfully')
    mintModal.value = false
  }
})

watch(isConfirmingDistributeMint, (isConfirming, wasConfirming) => {
  if (wasConfirming && !isConfirming && isSuccessDistributingMint.value) {
    emits('refetchShareholders')
    addSuccessToast('Distributed mint successfully')
    distributeMintModal.value = false
  }
})

watch(isConfirmingPayDividends, (isConfirming, wasConfirming) => {
  if (wasConfirming && !isConfirming && isSuccessPayDividends.value) {
    addSuccessToast('Paid dividends successfully')
    payDividendsModal.value = false
  }
})
</script>
