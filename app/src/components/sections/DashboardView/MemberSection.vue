<template>
  <UCard :ui="{ body: 'p-0' }">
    <template #header>
      <div class="flex items-center justify-between">
        <p class="font-semibold text-lg">Team Members List</p>

        <UModal
          v-if="teamStore.currentTeamMeta.data?.ownerAddress == userDataStore.address"
          v-model:open="showAddMemberForm.show"
          title="Add a new Member"
          :ui="{ content: 'rounded-2xl' }"
          @update:open="(v) => !v && (showAddMemberForm = { mount: false, show: false })"
        >
          <UButton
            icon="i-heroicons-plus-circle"
            color="success"
            data-test="add-member-button"
            label="Add a new Member"
            @click="showAddMemberForm = { mount: true, show: true }"
          />

          <template #body>
            <AddMemberForm
              v-if="teamStore.currentTeamId && showAddMemberForm.mount"
              :teamId="teamStore.currentTeamId"
              @memberAdded="showAddMemberForm = { mount: false, show: false }"
            />
          </template>
        </UModal>
      </div>
    </template>

    <UTable
      :data="
        teamStore.currentTeamMeta.data?.members.map((member: any, index: number) => ({
          index: index + 1,
          ...member
        }))
      "
      :meta="meta"
      :loading="isTeamWageDataFetching"
      :columns="columns"
      data-test="members-table"
    >
      <template #wage-header>
        <div class="flex flex-col gap-0 w-full pt-7">
          <div class="text-center pb-1">
            <span>Hourly Rates</span>
          </div>
          <div class="flex flex-row justify-between border-t border-base-400">
            <span class="w-1/3 text-xs p-1 text-center bg-[#C8FACD]">{{
              NETWORK.currencySymbol
            }}</span>
            <span class="w-1/3 text-xs p-1 text-center bg-[#FEF3DE]">USDC</span>
            <span class="w-1/3 text-xs p-1 text-center bg-[#D9F1F6]">SHER</span>
          </div>
        </div>
      </template>

      <template #member-cell="{ row }">
        <UserComponent
          :user="{
            name: row.original.name,
            address: row.original.address,
            imageUrl: row.original.imageUrl
          }"
        />
      </template>
      <template #standard-cell="{ row }">
        <div v-if="row.original.currentWage">
          <div
            v-for="rate in row.original.currentWage.ratePerHour"
            :key="rate.type"
            class="flex items-center gap-1"
          >
            <span
              class="inline-block w-2 h-2 rounded-full flex-shrink-0"
              :class="{
                'bg-yellow-400': rate.type === 'native',
                'bg-blue-500': rate.type === 'usdc',
                'bg-green-500': rate.type === 'usdt',
                'bg-purple-500': !['native', 'usdc', 'usdt'].includes(rate.type)
              }"
            />
            {{ rate.type === 'native' ? NETWORK.currencySymbol : rate.type.toUpperCase() }}
            {{ rate.amount }}
          </div>

          {{ row.original.currentWage.maximumHoursPerWeek + 'h/wk' }}
        </div>
        <div v-else>_</div>
      </template>
      <template #overtime-cell="{ row }">
        <div v-if="row.original.currentWage?.overtimeRatePerHour">
          <div
            v-for="rate in row.original.currentWage.overtimeRatePerHour"
            :key="rate.type"
            class="flex items-center gap-1"
          >
            <span
              class="inline-block w-2 h-2 rounded-full flex-shrink-0"
              :class="{
                'bg-yellow-400': rate.type === 'native',
                'bg-blue-500': rate.type === 'usdc',
                'bg-green-500': rate.type === 'usdt',
                'bg-purple-500': !['native', 'usdc', 'usdt'].includes(rate.type)
              }"
            />
            {{ rate.type === 'native' ? NETWORK.currencySymbol : rate.type.toUpperCase() }}
            {{ rate.amount }}
          </div>

          {{ row.original.currentWage.maximumOvertimeHoursPerWeek + 'h/wk' }}
        </div>
        <div v-else>_</div>
      </template>

      <template #action-cell="{ row }">
        <div v-if="teamId" class="flex flex-wrap gap-2">
          <DeleteMemberModal
            :member="{ name: row.original.name, address: row.original.address }"
            :teamId="teamId"
          />
          <UTooltip
            :text="
              !teamWageByAddress.get(row.original.address) ? 'No wage set for this member' : ''
            "
            :disabled="!!teamWageByAddress.get(row.original.address)"
            :delay-duration="0"
          >
            <UButton
              :color="teamWageByAddress.get(row.original.address)?.disabled ? 'success' : 'warning'"
              :loading="isToggling"
              :disabled="!teamWageByAddress.get(row.original.address) || isToggling"
              :icon="
                teamWageByAddress.get(row.original.address)?.disabled
                  ? 'i-heroicons-play'
                  : 'i-heroicons-pause'
              "
              :data-test="
                teamWageByAddress.get(row.original.address)?.disabled
                  ? 'resume-wage-button'
                  : 'pause-wage-button'
              "
              @click="toggleWageStatus(teamWageByAddress.get(row.original.address)!)"
            />
          </UTooltip>
          <SetMemberWageModal
            :member="{ name: row.original.name, address: row.original.address }"
            :teamId="teamId"
            :wage="teamWageByAddress.get(row.original.address)"
          />
        </div>
      </template>
    </UTable>
  </UCard>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import AddMemberForm from '@/components/sections/DashboardView/forms/AddMemberForm.vue'
import { useUserDataStore } from '@/stores/user'
import { useTeamStore, useToastStore } from '@/stores'
import UserComponent from '@/components/UserComponent.vue'
import { useGetTeamWagesQuery, useToggleWageStatusMutation } from '@/queries/wage.queries'
import { NETWORK } from '@/constant'
import DeleteMemberModal from '@/components/sections/DashboardView/DeleteMemberModal.vue'
import type { Member, Wage } from '@/types'
import SetMemberWageModal from './SetMemberWageModal.vue'
import type { TableMeta, Row } from '@tanstack/vue-table'

type MemberRow = Member & {
  index: number
}

const userDataStore = useUserDataStore()
const toastStore = useToastStore()
const teamStore = useTeamStore()
const showAddMemberForm = ref({ mount: false, show: false })

const teamId = computed(() => teamStore.currentTeamId)

const {
  data: teamWageData,
  isLoading: isTeamWageDataFetching,
  error: teamWageDataError
} = useGetTeamWagesQuery({ queryParams: { teamId } })

watch(
  () => teamWageDataError.value,
  (error) => {
    if (error) toastStore.addErrorToast('Failed to fetch team wage data')
  }
)

const teamWageByAddress = computed(() => {
  const map = new Map<string, Wage>()
  for (const wage of teamWageData.value ?? []) {
    map.set(wage.userAddress, wage as Wage)
  }
  return map
})

const { mutate: executeToggleStatus, isPending: isToggling } = useToggleWageStatusMutation()

const toggleWageStatus = (wage: Wage) => {
  const action = wage.disabled ? 'enable' : 'disable'
  executeToggleStatus(
    { pathParams: { wageId: wage.id }, queryParams: { action } },
    {
      onSuccess: () => toastStore.addSuccessToast(`Member wage ${action}d successfully`),
      onError: () => toastStore.addErrorToast(`Failed to ${action} member wage`)
    }
  )
}

const columns = computed((): TableColumn<MemberRow>[] => {
  const cols: TableColumn<MemberRow>[] = [
    { accessorKey: 'index', header: '#' },
    { id: 'member', header: 'Member' },
    { id: 'standard', header: 'Standard Wage' },
    { id: 'overtime', header: 'Overtime Wage' }
  ]
  if (teamStore.currentTeamMeta.data?.ownerAddress == userDataStore.address) {
    cols.push({ id: 'action', header: 'Action' })
  }
  return cols
})

const meta = computed((): TableMeta<MemberRow> => {
  return {
    class: {
      tr: (row: Row<MemberRow>) => {
        if (row.original.currentWage?.disabled === true) {
          return 'grayscale-[30%] bg-red-800'
        }
        return ''
      }
    }
  }
})
</script>
