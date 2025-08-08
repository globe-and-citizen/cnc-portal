<template>
  <CardComponent title="Shareholders List" class="w-full justify-between">
    <TableComponent
      :rows="
        shareholders?.map((shareholder, index) => ({
          index: index + 1,
          name: getShareholderName(shareholder.shareholder) || 'Unknown',
          address: shareholder.shareholder,
          balance: `${formatUnits(shareholder.amount, 6)} ${tokenSymbol}`,
          percentage: !totalSupplyLoading
            ? `${((BigInt(shareholder.amount) * BigInt(100)) / BigInt(totalSupply!)).toString()}%`
            : '...%',
          shareholder: shareholder.shareholder,
          amount: shareholder.amount
        })) ?? []
      "
      :columns="columns"
      :loading="shareholdersLoading"
    >
      <template #address-data="{ row }">
        <div class="flex w-full">
          <UserComponent
            :user="
              teamStore.currentTeam?.members?.find((member) => member.address === row.address) || {
                address: row.address,
                name: getShareholderName(row.address) || 'Unknown'
              }
            "
          />

          <!-- <AddressToolTip :address="row.address" /> -->
        </div>
      </template>

      <template #actions-data="{ row }">
        <div class="flex w-full">
          <ButtonUI
            variant="primary"
            :disabled="userStore.address != teamStore.currentTeam?.ownerAddress"
            data-test="mint-individual"
            @click="
              () => {
                selectedShareholder = row.shareholder
                mintIndividualModal = true
              }
            "
          >
            Mint Individual
          </ButtonUI>
        </div>
      </template>
    </TableComponent>
    <ModalComponent v-model="mintIndividualModal">
      <MintForm
        v-if="mintIndividualModal"
        :token-symbol="tokenSymbol"
        :loading="mintLoading || isConfirmingMint"
        :memberInput="{
          name: getShareholderName(selectedShareholder!),
          address: selectedShareholder!
        }"
        :disabled="true"
        @submit="(address: Address, amount: string) => mintToken(address, amount)"
      />
    </ModalComponent>
  </CardComponent>
</template>
<script setup lang="ts">
// import AddressToolTip from '@/components/AddressToolTip.vue'
import { formatUnits, parseUnits, type Address } from 'viem'
import MintForm from '@/components/sections/SherTokenView/forms/MintForm.vue'
import { ref } from 'vue'
import { useWaitForTransactionReceipt, useWriteContract } from '@wagmi/vue'
import { INVESTOR_ABI } from '@/artifacts/abi/investorsV1'
import { watch, computed } from 'vue'
import { log } from '@/utils'
import { useToastStore, useUserDataStore, useTeamStore } from '@/stores'
import ModalComponent from '@/components/ModalComponent.vue'
import ButtonUI from '@/components/ButtonUI.vue'
import CardComponent from '@/components/CardComponent.vue'
import TableComponent from '@/components/TableComponent.vue'
import UserComponent from '@/components/UserComponent.vue'
import { useReadContract } from '@wagmi/vue'

const emits = defineEmits(['refetchShareholders'])

const mintIndividualModal = ref(false)
const selectedShareholder = ref<Address | null>(null)

const { addErrorToast, addSuccessToast } = useToastStore()
const teamStore = useTeamStore()
const userStore = useUserDataStore()

const investorsAddress = computed(() => teamStore.getContractAddressByType('InvestorsV1'))

const { data: tokenSymbol, error: tokenSymbolError } = useReadContract({
  abi: INVESTOR_ABI,
  address: investorsAddress,
  functionName: 'symbol'
})

const {
  data: totalSupply,
  isLoading: totalSupplyLoading,
  error: totalSupplyError
} = useReadContract({
  abi: INVESTOR_ABI,
  address: investorsAddress,
  functionName: 'totalSupply'
})

const {
  data: shareholders,
  isLoading: shareholdersLoading,
  error: shareholderError
} = useReadContract({
  abi: INVESTOR_ABI,
  address: investorsAddress,
  functionName: 'getShareholders'
})

const {
  data: mintHash,
  writeContract: mint,
  isPending: mintLoading,
  error: mintError
} = useWriteContract()
const { isLoading: isConfirmingMint, isSuccess: isSuccessMinting } = useWaitForTransactionReceipt({
  hash: mintHash
})

const mintToken = (address: Address, amount: string) => {
  if (investorsAddress.value) {
    mint({
      abi: INVESTOR_ABI,
      address: investorsAddress.value,
      functionName: 'individualMint',
      args: [address, parseUnits(amount, 6)]
    })
  } else {
    addErrorToast('Investors contract address not found')
    log.error('Investors contract address not found')
  }
}

const getShareholderName = (address: Address) => {
  const member = teamStore.currentTeam?.members?.find((member) => member.address === address)
  const contract = teamStore.currentTeam?.teamContracts?.find(
    (contract) => contract.address === address
  )
  return member ? member.name : contract ? contract.type : 'Unknown'
}

watch(tokenSymbolError, (value) => {
  if (value) {
    log.error('Error fetching token symbol', value)
    addErrorToast('Error fetching token symbol')
  }
})

watch(totalSupplyError, (value) => {
  if (value) {
    log.error('Error fetching total supply', value)
    addErrorToast('Error fetching total supply')
  }
})

watch(shareholderError, (value) => {
  if (value) {
    log.error('Error fetching shareholders', value)
    addErrorToast('Error fetching shareholders')
  }
})

watch(mintError, (value) => {
  if (value) {
    log.error('Failed to mint', value)
    addErrorToast('Failed to mint')
  }
})

watch(isConfirmingMint, (isConfirming, wasConfirming) => {
  if (wasConfirming && !isConfirming && isSuccessMinting.value) {
    emits('refetchShareholders')
    addSuccessToast('Minted successfully')
    mintIndividualModal.value = false
  }
})

const columns = [
  { key: 'index', label: 'No', class: 'w-1/6 text-center' },
  { key: 'address', label: 'Member' },
  { key: 'percentage', label: 'Percentage' },
  { key: 'balance', label: 'Balance' },
  { key: 'actions', label: 'Actions', class: 'w-1/6 text-center' }
]
</script>
