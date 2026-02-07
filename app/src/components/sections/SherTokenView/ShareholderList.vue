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
        </div>
      </template>

      <template #actions-data="{ row }">
        <div class="flex w-full">
          <div
            :class="{ tooltip: userStore.address != teamStore.currentTeam?.ownerAddress }"
            :data-tip="
              userStore.address != teamStore.currentTeam?.ownerAddress
                ? 'Only the team owner can mint tokens for shareholders'
                : null
            "
          >
            <ButtonUI
              variant="primary"
              :disabled="userStore.address != teamStore.currentTeam?.ownerAddress"
              data-test="mint-individual"
              @click="
                () => {
                  selectedShareholder = row.shareholder
                  mintIndividualModal = { mount: true, show: true }
                }
              "
            >
              Mint Individual
            </ButtonUI>
          </div>
        </div>
      </template>
    </TableComponent>
    <ModalComponent
      v-model="mintIndividualModal.show"
      @reset="() => (mintIndividualModal = { mount: false, show: false })"
    >
      <MintForm
        v-if="mintIndividualModal.mount"
        v-model="mintIndividualModal.show"
        :memberInput="{
          name: getShareholderName(selectedShareholder!),
          address: selectedShareholder!
        }"
        :disabled="true"
        @close-modal="() => (mintIndividualModal = { mount: false, show: false })"
      />
    </ModalComponent>
  </CardComponent>
</template>
<script setup lang="ts">
import ButtonUI from '@/components/ButtonUI.vue'
import CardComponent from '@/components/CardComponent.vue'
import ModalComponent from '@/components/ModalComponent.vue'
import MintForm from '@/components/sections/SherTokenView/forms/MintForm.vue'
import TableComponent from '@/components/TableComponent.vue'
import UserComponent from '@/components/UserComponent.vue'
import {
  useInvestorShareholders,
  useInvestorSymbol,
  useInvestorTotalSupply
} from '@/composables/investor/reads'
import { useTeamStore, useUserDataStore } from '@/stores'
import { log } from '@/utils'
import { formatUnits, type Address } from 'viem'
import { ref, watch } from 'vue'

const mintIndividualModal = ref({
  mount: false,
  show: false
})
const selectedShareholder = ref<Address | null>(null)

const teamStore = useTeamStore()
const userStore = useUserDataStore()


const { data: tokenSymbol, error: tokenSymbolError } = useInvestorSymbol()

const {
  data: totalSupply,
  isLoading: totalSupplyLoading,
  error: totalSupplyError
} = useInvestorTotalSupply()

const {
  data: shareholders,
  isLoading: shareholdersLoading,
  error: shareholderError
} = useInvestorShareholders()

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
  }
})

watch(totalSupplyError, (value) => {
  if (value) {
    log.error('Error fetching total supply', value)
  }
})

watch(shareholderError, (value) => {
  if (value) {
    log.error('Error fetching shareholders', value)
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
