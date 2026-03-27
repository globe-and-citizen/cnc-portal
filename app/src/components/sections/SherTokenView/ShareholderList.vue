<template>
  <CardComponent title="Shareholders List" class="w-full justify-between">
    <TableComponent
      :rows="
        shareholdersList.map((shareholder, index) => ({
          index: index + 1,
          name: getShareholderName(shareholder.shareholder) || 'Unknown',
          address: shareholder.shareholder,
          balance: `${formatUnits(shareholder.amount, 6)} ${tokenSymbolText}`,
          percentage:
            !totalSupplyLoading && totalSupplyValue != null
              ? `${((shareholder.amount * 100n) / totalSupplyValue).toString()}%`
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
            <UButton
              color="primary"
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
            </UButton>
          </div>
        </div>
      </template>
    </TableComponent>
    <UModal
      v-model:open="mintIndividualModal.show"
      :close="{
        onClick: () => {
          mintIndividualModal = { mount: false, show: false }
        }
      }"
    >
      <template #body>
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
      </template>
    </UModal>
  </CardComponent>
</template>
<script setup lang="ts">
import CardComponent from '@/components/CardComponent.vue'
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
import { computed, ref, watch } from 'vue'

type ShareholderInfo = {
  shareholder: Address
  amount: bigint
}

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

const shareholdersList = computed<ShareholderInfo[]>(() => {
  return Array.isArray(shareholders.value) ? (shareholders.value as ShareholderInfo[]) : []
})

const tokenSymbolText = computed(() =>
  typeof tokenSymbol.value === 'string' ? tokenSymbol.value : ''
)

const totalSupplyValue = computed(() =>
  typeof totalSupply.value === 'bigint' ? totalSupply.value : undefined
)

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
