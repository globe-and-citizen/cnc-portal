<template>
  <CardComponent title="Investor Actions">
    <div class="flex flex-col justify-around gap-2 w-full" data-test="investors-actions">
      <div class="flex justify-end gap-2 w-full">
        <div class="relative group">
          <!-- :disabled="!tokenSymbol || currentAddress != team.ownerAddress" -->
          <ButtonUI
            variant="primary"
            :disabled="true"
            data-test="distribute-mint-button"
            @click="distributeMintModal = true"
          >
            Distribute Mint {{ tokenSymbol }}
          </ButtonUI>
          <span
            class="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-2 py-1 text-sm bg-green-900 text-white rounded opacity-0 group-hover:opacity-100 transition"
            style="white-space: nowrap"
          >
            Coming soon
          </span>
        </div>
        <ButtonUI
          variant="primary"
          outline
          data-test="mint-button"
          :disabled="!tokenSymbol || currentAddress != teamStore.currentTeam?.ownerAddress"
          @click="mintModal = true"
        >
          Mint {{ tokenSymbol }}
        </ButtonUI>
        <ButtonUI
          variant="primary"
          data-test="pay-dividends-button"
          @click="payDividendsModal = true"
          :disabled="
            !tokenSymbol ||
            currentAddress != teamStore.currentTeam?.ownerAddress ||
            (shareholders?.length ?? 0) == 0
          "
        >
          Pay Dividends
        </ButtonUI>
      </div>

      <div class="flex gap-x-1 transform -translate-y-8">
        <h4>Contract Address :</h4>
        <AddressToolTip :address="investorsAddress" v-if="investorsAddress" />
      </div>
      <ModalComponent v-model="mintModal">
        <MintForm v-if="mintModal" v-model="mintModal"></MintForm>
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
          v-if="payDividendsModal && teamStore.currentTeam"
          :loading="payDividendsLoading || isConfirmingPayDividends"
          :token-symbol="tokenSymbol!"
          :team="teamStore.currentTeam"
          @submit="executePayDividends"
        ></PayDividendsForm>
      </ModalComponent>
    </div>
  </CardComponent>
</template>
<script setup lang="ts">
import { INVESTOR_ABI } from '@/artifacts/abi/investorsV1'
import ModalComponent from '@/components/ModalComponent.vue'
import { useTeamStore, useToastStore, useUserDataStore } from '@/stores'
import { log } from '@/utils'
import { useReadContract, useWaitForTransactionReceipt, useWriteContract } from '@wagmi/vue'
import { type Address } from 'viem'
import { computed, ref, watch } from 'vue'
import MintForm from '@/components/sections/SherTokenView/forms/MintForm.vue'
import DistributeMintForm from '@/components/sections/SherTokenView/forms/DistributeMintForm.vue'
import PayDividendsForm from '@/components/sections/SherTokenView/forms/PayDividendsForm.vue'
import BANK_ABI from '@/artifacts/abi/bank.json'
import ButtonUI from '@/components/ButtonUI.vue'
import CardComponent from '@/components/CardComponent.vue'
import AddressToolTip from '@/components/AddressToolTip.vue'

const { addErrorToast, addSuccessToast } = useToastStore()
const mintModal = ref(false)
const distributeMintModal = ref(false)
const payDividendsModal = ref(false)
const emits = defineEmits(['refetchShareholders'])
const { address: currentAddress } = useUserDataStore()

const teamStore = useTeamStore()

const investorsAddress = computed(() => teamStore.getContractAddressByType('InvestorsV1'))

const { data: tokenSymbol, error: tokenSymbolError } = useReadContract({
  abi: INVESTOR_ABI,
  address: investorsAddress,
  functionName: 'symbol'
})

const { data: shareholders, error: shareholderError } = useReadContract({
  abi: INVESTOR_ABI,
  address: investorsAddress,
  functionName: 'getShareholders'
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
    address: investorsAddress.value as Address,
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

watch(distributeMintError, () => {
  if (distributeMintError.value) {
    log.error('Failed to distribute mint', distributeMintError.value)
    addErrorToast('Failed to distribute mint')
  }
})

watch(payDividendsError, () => {
  if (payDividendsError.value) {
    log.error('Failed to pay dividends', payDividendsError.value)
    addErrorToast('Failed to pay dividends')
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

watch(tokenSymbolError, (value) => {
  if (value) {
    log.error('Error fetching token symbol', value)
    addErrorToast('Error fetching token symbol')
  }
})

watch(shareholderError, (value) => {
  if (value) {
    log.error('Error fetching shareholders', value)
    addErrorToast('Error fetching shareholders')
  }
})
</script>
