<template>
  <div>
    <CardComponent title="Vesting Stats">
      <div class="flex flex-col justify-around gap-2 w-full" data-test="investors-actions">
        <TableComponent
          :rows="tokenSummaryRows"
          :columns="tokenSummaryColumns"
          :sticky="true"
          :showPagination="true"
        >
        </TableComponent>
      </div>
    </CardComponent>
  </div>
  <div>
    <ButtonUI
      size="sm"
      variant="primary"
      @click="addVestingModal = true"
      v-if="team?.ownerAddress == useUserDataStore().address"
      data-test="createAddVesting"
    >
      add vesting
    </ButtonUI>

    <CardComponent title="Vesting Overview">
      <div class="flex flex-col justify-around gap-2 w-full" data-test="investors-actions">
        <TableComponent :rows="rows" :columns="columns" :sticky="true" :showPagination="true">
          <template #token-data="{ row }">
            <span class="badge badge-outline">{{ getTokenSymbol(row as VestingRow) }}</span>
          </template>
          <template #vestablePerDay-data="{ row }">
            <span class="text-sm text-gray-700">
              {{ getVestablePerDay(row as VestingRow) }}
            </span>
          </template>

          <template #releasable-data="{ row }">
            <span class="badge badge-info">
              {{ getReleasable(row as VestingRow) }}
            </span>
          </template>
          <template #member-data="{ row }">
            <span v-if="useUserDataStore().address === row.member" class="badge badge-info">
              {{ row.member?.slice(0, 5) }}
            </span>
            <span v-else>{{ row.member?.slice(0, 5) }}</span>
          </template>
          <template #actions-data="{ row }">
            <div class="flex flex-wrap gap-2">
              <!-- Stop Button -->

              <button
                v-if="row.status === 'Active' && team?.ownerAddress == useUserDataStore().address"
                class="btn btn-xs btn-error flex items-center justify-center"
                @click.stop="stopVesting(row as VestingRow)"
              >
                <IconifyIcon icon="mdi:stop-circle-outline" class="mr-1" />
                <span class="text-xs">Stop</span>
              </button>

              <!-- Withdraw Button -->

              <button
                v-if="row.status === 'Inactive' && team?.ownerAddress == useUserDataStore().address"
                class="btn btn-xs btn-warning flex items-center justify-center"
                @click.stop="withdrawUnvested(row as VestingRow)"
              >
                <IconifyIcon icon="mdi:bank-transfer-out" class="mr-1" />
                <span class="text-xs">Withdraw</span>
              </button>

              <!-- Release Button -->

              <button
                v-if="row.status === 'Active' && row.member === useUserDataStore().address"
                class="btn btn-xs btn-success flex items-center justify-center"
                @click.stop="releaseTokens(row as VestingRow)"
              >
                <IconifyIcon icon="mdi:lock-open" class="mr-1" />
                <span class="text-xs">Release</span>
              </button>
            </div>
          </template>
        </TableComponent>
      </div>
    </CardComponent>
    <ModalComponent v-model="addVestingModal">
      <CreateVesting
        @closeAddVestingModal="addVestingModal = false"
        @submit="handleCreateVesting"
        v-if="team?.id"
        :teamId="team?.id ? Number(team.id) : 0"
      />
    </ModalComponent>
  </div>
</template>

<script setup lang="ts">
import TableComponent from '@/components/TableComponent.vue'
import CardComponent from '@/components/CardComponent.vue'
import { ref, computed } from 'vue'
import { type VestingRow, type TokenSummary } from '@/types/vesting'
import { Icon as IconifyIcon } from '@iconify/vue'
import { useTeamStore } from '@/stores'
import ButtonUI from '@/components/ButtonUI.vue'
import CreateVesting from '@/components/forms/CreateVesting.vue'
import { useUserDataStore } from '@/stores'
import { useToastStore } from '@/stores/useToastStore'
import { getVestingsByTeamId, vestingteamsMap } from '@/stores/__mocks__/vestingStore'
import ModalComponent from '@/components/ModalComponent.vue'
const { addErrorToast, addSuccessToast } = useToastStore()

const teamStore = useTeamStore()
const team = computed(() => teamStore.currentTeam)

// Define columns including the new "Actions" column
const columns = [
  { key: 'member', label: 'Member Address', sortable: true },
  { key: 'token', label: 'Token', sortable: false },
  { key: 'startDate', label: 'Start Date', sortable: true },
  { key: 'durationDays', label: 'Duration (days)', sortable: true },
  { key: 'vestablePerDay', label: 'Per Day', sortable: false },
  { key: 'totalAmount', label: 'Total Amount', sortable: true },
  { key: 'released', label: 'Released', sortable: true },
  { key: 'status', label: 'Status', sortable: true },
  { key: 'releasable', label: 'Releasable', sortable: false },
  { key: 'actions', label: 'Actions' }
]

const addVestingModal = ref(false)

const tokenSummaryRows = computed(() => {
  const summaryMap: Record<string, TokenSummary> = {}

  for (const row of rows.value ?? []) {
    const symbol = getTokenSymbol(row)
    if (!summaryMap[symbol]) {
      summaryMap[symbol] = {
        symbol,
        totalVested: 0,
        totalReleased: 0
      }
    }
    summaryMap[symbol].totalVested += row.totalAmount
    summaryMap[symbol].totalReleased += row.released
  }

  return Object.values(summaryMap)
})

const tokenSummaryColumns = [
  { key: 'symbol', label: 'Token Symbol', sortable: false },
  { key: 'totalVested', label: 'Total Vested', sortable: false },
  { key: 'totalReleased', label: 'Total Released', sortable: false }
]

// Fake/mock vesting rows
const rows = ref<VestingRow[]>()
import { watchEffect } from 'vue'

watchEffect(async () => {
  // Use the vesting store to fetch vestings for the current team
  if (team.value?.id) {
    rows.value = getVestingsByTeamId(
      Number(team.value.id),
      useUserDataStore().address as `0x${string}`
    ).map((row) => ({
      ...row,
      status: row.status === 'Active' ? 'Active' : 'Inactive'
    })) as VestingRow[]
  } else {
    rows.value = []
  }
})

function getVestablePerDay(row: VestingRow): number {
  return Number((row.totalAmount / row.durationDays).toFixed(2))
}
function getReleasable(row: VestingRow): number {
  const now = Math.floor(Date.now() / 1000)
  const start = new Date(row.startDate).getTime() / 1000
  const duration = row.durationDays * 86400
  const cliff = row.cliffDays * 86400
  const total = row.totalAmount
  const released = row.released

  if (now < start + cliff) return 0
  if (now >= start + duration) return total - released
  const elapsed = now - start
  const vested = Math.floor((total * elapsed) / duration)
  return Math.max(vested - released, 0)
}

function stopVesting(row: VestingRow) {
  try {
    // Simulate stop vesting logic
    row.status = 'Inactive'
    addSuccessToast(`Successfully stopped vesting for ${row.member} in team ${row.teamId}`)
  } catch (error) {
    console.error(error)
    addErrorToast(`Failed to stop vesting for ${row.member} in team ${row.teamId}`)
  }
}

function withdrawUnvested(row: VestingRow) {
  try {
    // Simulate withdraw logic
    // If successful:
    addSuccessToast(`Successfully withdrew unvested tokens for ${row.member} in team ${row.teamId}`)
  } catch (error) {
    console.error(error)
    addErrorToast(`Failed to withdraw unvested tokens for ${row.member} in team ${row.teamId}`)
  }
}

function releaseTokens(row: VestingRow) {
  try {
    // Simulate release logic
    // If successful:
    addSuccessToast(`Successfully released tokens for ${row.member} in team ${row.teamId}`)
  } catch (error) {
    console.error(error)
    addErrorToast(`Failed to release tokens for ${row.member} in team ${row.teamId}`)
  }
}

function handleCreateVesting(payload: VestingRow) {
  addSuccessToast('Vesting created successfully')
  console.log('vesting creation payload', payload)
  addVestingModal.value = false

  // Interact with smart contract (e.g. writeContract)
}
function getTokenSymbol(row: VestingRow): string {
  return vestingteamsMap[row.teamId]?.symbol ?? 'Unknown'
}
</script>
