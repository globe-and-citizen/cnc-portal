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
      :loading="loading"
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
            :disabled="currentAddress != team.ownerAddress"
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
import { watch } from 'vue'
import { log } from '@/utils'
import { useToastStore, useUserDataStore, useTeamStore } from '@/stores'
import type { Team } from '@/types'
import ModalComponent from '@/components/ModalComponent.vue'
import ButtonUI from '@/components/ButtonUI.vue'
import CardComponent from '@/components/CardComponent.vue'
import TableComponent from '@/components/TableComponent.vue'
import UserComponent from '@/components/UserComponent.vue'

const mintIndividualModal = ref(false)
const selectedShareholder = ref<Address | null>(null)
const emits = defineEmits(['refetchShareholders'])
const { addErrorToast, addSuccessToast } = useToastStore()
const { address: currentAddress } = useUserDataStore()
const teamStore = useTeamStore()

const props = defineProps<{
  team: Partial<Team>
  tokenSymbol: string | undefined
  tokenSymbolLoading: boolean
  totalSupply: bigint | undefined
  totalSupplyLoading: boolean
  shareholders:
    | readonly {
        shareholder: Address
        amount: bigint
      }[]
    | undefined
  loading: boolean
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

const mintToken = (address: Address, amount: string) => {
  mint({
    abi: INVESTOR_ABI,
    address: props.team.teamContracts?.find((contract) => contract.type === 'InvestorsV1')
      ?.address as Address,
    functionName: 'individualMint',
    args: [address, parseUnits(amount, 6)]
  })
}

const getShareholderName = (address: Address) => {
  const member = teamStore.currentTeam?.members?.find((member) => member.address === address)
  const contract = teamStore.currentTeam?.teamContracts?.find(
    (contract) => contract.address === address
  )
  return member ? member.name : contract ? contract.type : 'Unknown'
}

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
