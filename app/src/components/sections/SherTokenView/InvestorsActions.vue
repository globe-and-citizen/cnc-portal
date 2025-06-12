<template>
  <CardComponent title="Investor Actions">
    <div class="flex flex-col justify-around gap-2 w-full" data-test="investors-actions">
      <div class="flex justify-end gap-2 w-full">
        <ButtonUI
          variant="primary"
          data-test="distribute-mint-button"
          :disabled="!tokenSymbol || currentAddress != team.ownerAddress"
          @click="distributeMintModal = true"
        >
          Distribute Mint {{ tokenSymbol }}
        </ButtonUI>
        <ButtonUI
          variant="primary"
          data-test="pay-dividends-button"
          @click="payDividendsModal = true"
          :disabled="
            !tokenSymbol || currentAddress != team.ownerAddress || (shareholders?.length ?? 0) == 0
          "
        >
          Pay Dividends
        </ButtonUI>
        <ButtonUI
          variant="primary"
          data-test="mint-button"
          :disabled="!tokenSymbol || currentAddress != team.ownerAddress"
          @click="mintModal = true"
        >
          Mint {{ tokenSymbol }}
        </ButtonUI>
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
          :team="team"
          @submit="executePayDividends"
        ></PayDividendsForm>
      </ModalComponent>
    </div>
  </CardComponent>
</template>
<script setup lang="ts">
import { INVESTOR_ABI } from '@/artifacts/abi/investorsV1'
import ModalComponent from '@/components/ModalComponent.vue'
import { useToastStore, useUserDataStore } from '@/stores'
import type { Team } from '@/types'
import { log } from '@/utils'
import { useWaitForTransactionReceipt, useWriteContract } from '@wagmi/vue'
import { parseUnits, type Address } from 'viem'
import { computed, ref, watch } from 'vue'
import MintForm from '@/components/sections/SherTokenView/forms/MintForm.vue'
import DistributeMintForm from '@/components/sections/SherTokenView/forms/DistributeMintForm.vue'
import PayDividendsForm from '@/components/sections/SherTokenView/forms/PayDividendsForm.vue'
import BANK_ABI from '@/artifacts/abi/bank.json'
import ButtonUI from '@/components/ButtonUI.vue'
import CardComponent from '@/components/CardComponent.vue'

const { addErrorToast, addSuccessToast } = useToastStore()
const mintModal = ref(false)
const distributeMintModal = ref(false)
const payDividendsModal = ref(false)
const emits = defineEmits(['refetchShareholders'])
const { address: currentAddress } = useUserDataStore()

const props = defineProps<{
  team: Team
  tokenSymbol: string | undefined
  tokenSymbolLoading: boolean
  shareholders: ReadonlyArray<{ shareholder: Address; amount: bigint }> | undefined
}>()

const investorsAddress = computed(
  () =>
    props.team.teamContracts.find((contract) => contract.type === 'InvestorsV1')?.address as Address
)
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
  writeContract: payDividends,
  isPending: payDividendsLoading,
  error: payDividendsError
} = useWriteContract()

const { isLoading: isConfirmingPayDividends, isSuccess: isSuccessPayDividends } =
  useWaitForTransactionReceipt({
    hash: payDividendsHash
  })

const executePayDividends = (value: bigint) => {
  payDividends({
    abi: BANK_ABI,
    address: props.team.teamContracts.find((contract) => contract.type === 'Bank')
      ?.address as Address,
    functionName: 'transfer',
    args: [investorsAddress.value, value]
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
    address: investorsAddress.value as Address,
    functionName: 'distributeMint',
    args: [shareholders]
  })
}

const mintToken = (address: Address, amount: string) => {
  mint({
    abi: INVESTOR_ABI,
    address: investorsAddress.value as Address,
    functionName: 'individualMint',
    args: [address, parseUnits(amount, 6)]
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
