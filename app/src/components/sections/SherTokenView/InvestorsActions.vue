<template>
  <CardComponent title="Investor Actions">
    <div class="flex flex-col justify-around gap-2 w-full" data-test="investors-actions">
      <div class="flex items-end w-full justify-between">
        <div class="flex gap-x-1">
          <h4>Contract Address :</h4>
          <AddressToolTip :address="investorsAddress" v-if="investorsAddress" />
        </div>
        <div class="flex gap-2">
          <div :class="{ tooltip: true }" data-tip="Coming soon">
            <ButtonUI
              variant="primary"
              :disabled="true"
              data-test="distribute-mint-button"
              @click="distributeMintModal = true"
            >
              Distribute Mint {{ tokenSymbol }}
            </ButtonUI>
          </div>
          <div
            :class="{ tooltip: tokenSymbol && currentAddress != investorsOwner }"
            :data-tip="
              tokenSymbol && currentAddress != investorsOwner
                ? 'Only the token owner can mint tokens'
                : null
            "
          >
            <ButtonUI
              variant="primary"
              outline
              data-test="mint-button"
              :disabled="!tokenSymbol || currentAddress != investorsOwner"
              @click="mintModal = { mount: true, show: true }"
            >
              Mint {{ tokenSymbol }}
            </ButtonUI>
          </div>
          <div
            :class="{
              tooltip:
                (tokenSymbol && !isBodAction && currentAddress != bankOwner) ||
                (tokenSymbol && (shareholders?.length ?? 0) === 0)
            }"
            :data-tip="
              tokenSymbol && !isBodAction && currentAddress != bankOwner
                ? 'Only the bank owner can pay dividends'
                : tokenSymbol && (shareholders?.length ?? 0) === 0
                  ? 'No shareholders available to pay dividends'
                  : null
            "
          >
            <ButtonUI
              variant="primary"
              data-test="pay-dividends-button"
              @click="payDividendsModal = { mount: true, show: true }"
              :disabled="
                !tokenSymbol ||
                (!isBodAction && currentAddress != bankOwner) ||
                (shareholders?.length ?? 0) === 0
              "
            >
              Pay Dividends
            </ButtonUI>
          </div>
        </div>
      </div>
      <ModalComponent
        v-model="mintModal.show"
        v-if="mintModal.mount"
        @reset="() => (mintModal = { mount: false, show: false })"
      >
        <MintForm
          v-model="mintModal.show"
          @close-modal="() => (mintModal = { mount: false, show: false })"
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
      <ModalComponent
        v-model="payDividendsModal.show"
        v-if="payDividendsModal.mount"
        @reset="() => (payDividendsModal = { mount: false, show: false })"
      >
        <PayDividendsForm
          v-if="payDividendsModal && teamStore.currentTeam"
          :loading="
            payDividendsLoading ||
            isConfirmingPayDividends ||
            isLoadingAddAction ||
            isConfirmingAddAction
          "
          :token-symbol="tokenSymbol!"
          :team="teamStore.currentTeam"
          @submit="executePayDividends"
          :is-bod-action="isBodAction"
          @close-modal="() => (payDividendsModal = { mount: false, show: false })"
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
import { type Address, encodeFunctionData, formatUnits, type Abi } from 'viem'
import { ref, watch } from 'vue'
import MintForm from '@/components/sections/SherTokenView/forms/MintForm.vue'
import DistributeMintForm from '@/components/sections/SherTokenView/forms/DistributeMintForm.vue'
import PayDividendsForm from '@/components/sections/SherTokenView/forms/PayDividendsForm.vue'
import BANK_ABI from '@/artifacts/abi/bank.json'
import ButtonUI from '@/components/ButtonUI.vue'
import CardComponent from '@/components/CardComponent.vue'
import AddressToolTip from '@/components/AddressToolTip.vue'

import { useBodContract } from '@/composables/bod/'

const { addErrorToast, addSuccessToast } = useToastStore()

const {
  addAction,
  useBodIsBodAction,
  isLoading: isLoadingAddAction,
  isConfirming: isConfirmingAddAction,
  isActionAdded
} = useBodContract()

const mintModal = ref({
  mount: false,
  show: false
})
const distributeMintModal = ref(false)
const payDividendsModal = ref({
  mount: false,
  show: false
})
const emits = defineEmits(['refetchShareholders'])
const { address: currentAddress } = useUserDataStore()

const teamStore = useTeamStore()
const investorsAddress = teamStore.getContractAddressByType('InvestorsV1')
const bankAddress = teamStore.getContractAddressByType('Bank')

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

const executePayDividends = async (value: bigint) => {
  if (isBodAction.value) {
    const data = encodeFunctionData({
      abi: BANK_ABI,
      functionName: 'transfer',
      args: [investorsAddress, value]
    })
    const description = JSON.stringify({
      text: `Pay dividends of ${formatUnits(value, 18)} to ${investorsAddress}`,
      title: `Pay Dividends Request`
    })

    await addAction({
      targetAddress: bankAddress,
      description,
      data
    })
  } else {
    payDividends({
      abi: BANK_ABI,
      address: bankAddress as Address,
      functionName: 'transfer',
      args: [investorsAddress, value]
    })
  }
}
const executeDistributeMint = (
  shareholders: ReadonlyArray<{
    readonly shareholder: Address
    readonly amount: bigint
  }>
) => {
  distributeMint({
    abi: INVESTOR_ABI,
    address: investorsAddress as Address,
    functionName: 'distributeMint',
    args: [shareholders]
  })
}

const {
  data: bankOwner,
  //isLoading: isLoadingBankOwner,
  error: errorBankOwner
  //refetch: executeBankOwner
} = useReadContract({
  functionName: 'owner',
  address: bankAddress,
  abi: BANK_ABI
})

const { isBodAction } = useBodIsBodAction(bankAddress as Address, BANK_ABI as Abi)

const {
  data: investorsOwner,
  //isLoading: isLoadingInvestorsOwner,
  error: errorInvestorsOwner
  //refetch: executeInvestorsOwner
} = useReadContract({
  functionName: 'owner',
  address: investorsAddress,
  abi: INVESTOR_ABI
})

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
    payDividendsModal.value = { mount: false, show: false }
  }
})

watch(isActionAdded, (isAdded) => {
  if (isAdded) {
    payDividendsModal.value = { mount: false, show: false }
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

watch(errorBankOwner, (value) => {
  if (value) {
    log.error('Error fetching bank owner', value)
    addErrorToast('Error fetching bank owner')
  }
})

watch(errorInvestorsOwner, (value) => {
  if (value) {
    log.error('Error fetching investors owner', value)
    addErrorToast('Error fetching investors owner')
  }
})
</script>
