<template>
  <UCard class="w-full justify-between">
    <template #header>Shareholders List</template>
    <UTable
      :data="
        shareholdersList.map((shareholder, index) => ({
          index: index + 1,
          name: getShareholderName(shareholder.shareholder) || 'Unknown',
          address: shareholder.shareholder,
          balance: `${formatUnits(shareholder.amount, 6)} ${tokenSymbolText}`,
          percentage:
            !totalSupplyLoading && totalSupplyValue != null
              ? `${formatStakePercentageFromSupply(shareholder.amount, totalSupplyValue, 2, true)}%`
              : '...%',
          shareholder: shareholder.shareholder,
          amount: shareholder.amount
        })) ?? []
      "
      :columns="columns"
      :loading="shareholdersLoading"
    >
      <template #address-cell="{ row: { original: row } }">
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

      <template #actions-cell="{ row: { original: row } }">
        <div class="flex w-full">
          <UTooltip :text="mintIndividualTooltip">
            <UButton
              color="primary"
              :disabled="
                isWriteDisabled || userStore.address != teamStore.currentTeam?.ownerAddress
              "
              data-test="mint-individual"
              @click="openMintIndividualModal(row.shareholder)"
            >
              Mint Individual
            </UButton>
          </UTooltip>
        </div>
      </template>
    </UTable>
    <UModal
      v-model:open="mintIndividualModal.show"
      title="Mint Tokens for Shareholder"
      description="Mint tokens directly for the selected shareholder."
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
  </UCard>
</template>
<script setup lang="ts">
import MintForm from '@/components/sections/SherTokenView/forms/MintForm.vue'
import UserComponent from '@/components/UserComponent.vue'
import {
  useInvestorShareholders,
  useInvestorSymbol,
  useInvestorTotalSupply
} from '@/composables/investor/reads'
import { useTeamStore, useUserDataStore } from '@/stores'
import { log } from '@/utils'
import { formatStakePercentageFromSupply } from '@/utils/investorMintAllocation'
import { formatUnits, type Address } from 'viem'
import { computed, ref, watch } from 'vue'
import { useTeamWriteGuard } from '@/composables/useTeamWriteGuard'

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
const { isWriteDisabled, archivedTooltip } = useTeamWriteGuard()

const mintIndividualTooltip = computed(() => {
  if (archivedTooltip.value) return archivedTooltip.value
  if (userStore.address != teamStore.currentTeam?.ownerAddress) {
    return 'Only the team owner can mint tokens for shareholders'
  }
  return undefined
})

function openMintIndividualModal(shareholder: Address) {
  if (isWriteDisabled.value) return
  selectedShareholder.value = shareholder
  mintIndividualModal.value = { mount: true, show: true }
}

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
  { accessorKey: 'index', header: 'No' },
  { accessorKey: 'address', header: 'Member' },
  { accessorKey: 'percentage', header: 'Percentage' },
  { accessorKey: 'balance', header: 'Balance' },
  { accessorKey: 'actions', header: 'Actions' }
]
</script>
