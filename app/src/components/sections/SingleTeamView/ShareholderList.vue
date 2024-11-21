<template>
  <div class="flex flex-col gap-4">
    <h2>Shareholders</h2>
    <div class="overflow-x-auto">
      <table class="table">
        <thead class="text-sm font-bold">
          <tr class="text-center">
            <th>Address</th>
            <th>Balance</th>
            <th>Percentage</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody v-if="(shareholders?.length || 0) == 0 && !loading">
          <tr>
            <td colspan="4" class="text-center font-bold">No shareholders</td>
          </tr>
        </tbody>
        <tbody v-if="loading">
          <tr>
            <td colspan="4" class="loading loading-spinner loading-lg"></td>
          </tr>
        </tbody>

        <tbody v-if="!loading && (shareholders?.length || 0) > 0">
          <tr
            class="text-center"
            v-for="shareholder in shareholders"
            :key="shareholder.shareholder"
          >
            <td>
              <AddressToolTip :address="shareholder.shareholder" />
            </td>
            <td>{{ formatEther(shareholder.amount) }} {{ tokenSymbol }}</td>
            <td class="text-center" v-if="!totalSupplyLoading">
              {{ ((BigInt(shareholder.amount) * BigInt(100)) / BigInt(totalSupply!)).toString() }}%
            </td>
            <td v-else class="text-center">...%</td>
            <td>
              <button
                class="btn btn-primary"
                :disabled="currentAddress != team.ownerAddress"
                @click="
                  () => {
                    selectedShareholder = shareholder.shareholder
                    mintIndividualModal = true
                  }
                "
              >
                Mint Individual
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <ModalComponent v-model="mintIndividualModal">
      <MintForm
        v-if="mintIndividualModal"
        :token-symbol="tokenSymbol"
        :loading="mintLoading || isConfirmingMint"
        :address="selectedShareholder!"
        @submit="(address: Address, amount: string) => mintToken(address, amount)"
      />
    </ModalComponent>
  </div>
</template>
<script setup lang="ts">
import AddressToolTip from '@/components/AddressToolTip.vue'
import { formatEther, parseEther, type Address } from 'viem'
import MintForm from '@/components/sections/SingleTeamView/forms/MintForm.vue'
import { ref } from 'vue'
import { useWaitForTransactionReceipt, useWriteContract } from '@wagmi/vue'
import { INVESTOR_ABI } from '@/artifacts/abi/investorsV1'
import { watch } from 'vue'
import { log } from '@/utils'
import { useToastStore, useUserDataStore } from '@/stores'
import type { Team } from '@/types'
import ModalComponent from '@/components/ModalComponent.vue'

const mintIndividualModal = ref(false)
const selectedShareholder = ref<Address | null>(null)
const emits = defineEmits(['refetchShareholders'])
const { addErrorToast, addSuccessToast } = useToastStore()
const { address: currentAddress } = useUserDataStore()

const props = defineProps<{
  team: Team
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
    address: props.team.investorsAddress as Address,
    functionName: 'individualMint',
    args: [address, parseEther(amount)]
  })
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
</script>
