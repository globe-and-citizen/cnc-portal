<template>
  <UCard :ui="{ body: 'p-0' }">
    <template #header>
      <div class="flex items-center justify-between">
        <p class="font-semibold text-lg">Team Members</p>

        <UModal
          v-if="teamStore.currentTeamMeta.data?.ownerAddress == userDataStore.address"
          v-model:open="showAddMemberForm.show"
          title="Add Member"
          :ui="{ content: 'rounded-2xl' }"
          @update:open="(v) => !v && (showAddMemberForm = { mount: false, show: false })"
        >
          <UButton
            icon="i-heroicons-plus-circle"
            color="success"
            data-test="add-member-button"
            label="Add Member"
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
        teamStore.currentTeamMeta.data?.members.map((member: Member, index: number) => ({
          index: index + 1,
          ...member
        }))
      "
      :loading="teamStore.currentTeamMeta.isPending || isToggling"
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
          <RateDotList :rates="row.original.currentWage.ratePerHour" />
          {{ row.original.currentWage.maximumHoursPerWeek + 'h/wk' }}
        </div>
        <div v-else>—</div>
      </template>
      <template #overtime-cell="{ row }">
        <div v-if="row.original.currentWage?.overtimeRatePerHour">
          <RateDotList :rates="row.original.currentWage.overtimeRatePerHour" />
          {{ row.original.currentWage.maximumOvertimeHoursPerWeek + 'h/wk' }}
        </div>
        <div v-else>—</div>
      </template>

      <template #action-cell="{ row }">
        <div v-if="teamId" class="flex flex-wrap gap-2">
          <DeleteMemberModal
            :member="{ name: row.original.name, address: row.original.address }"
            :teamId="teamId"
          />
          <UTooltip
            :text="
              !row.original.currentWage
                ? 'No wage set yet'
                : row.original.currentWage?.disabled
                  ? 'Resume wage'
                  : 'Pause wage'
            "
            :delay-duration="0"
          >
            <UButton
              :color="row.original.currentWage?.disabled ? 'success' : 'warning'"
              :loading="isToggling"
              :disabled="!row.original.currentWage || isToggling"
              :icon="row.original.currentWage?.disabled ? 'i-heroicons-play' : 'i-heroicons-pause'"
              :data-test="
                row.original.currentWage?.disabled ? 'resume-wage-button' : 'pause-wage-button'
              "
              @click="toggleWageStatus(row.original.currentWage!)"
            />
          </UTooltip>
          <SetMemberWageModal
            :member="{ name: row.original.name, address: row.original.address }"
            :teamId="teamId"
            :wage="row.original.currentWage"
          />
        </div>
      </template>
    </UTable>
  </UCard>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import AddMemberForm from '@/components/sections/DashboardView/forms/AddMemberForm.vue'
import { useUserDataStore } from '@/stores/user'
import { useTeamStore, useToastStore } from '@/stores'
import UserComponent from '@/components/UserComponent.vue'
import { useToggleWageStatusMutation } from '@/queries/wage.queries'
import { teamKeys } from '@/queries/team.queries'
import { useQueryClient } from '@tanstack/vue-query'
import { NETWORK } from '@/constant'
import DeleteMemberModal from '@/components/sections/DashboardView/DeleteMemberModal.vue'
import type { Member, Wage } from '@/types'
import SetMemberWageModal from './SetMemberWageModal.vue'
import RateDotList from '@/components/RateDotList.vue'

type MemberRow = Member & {
  index: number
}

const userDataStore = useUserDataStore()
const toastStore = useToastStore()
const teamStore = useTeamStore()
const showAddMemberForm = ref({ mount: false, show: false })

const teamId = computed(() => teamStore.currentTeamId)

const queryClient = useQueryClient()

const { mutate: executeToggleStatus, isPending: isToggling } = useToggleWageStatusMutation()

const toggleWageStatus = (wage: Wage) => {
  const action = wage.disabled ? 'enable' : 'disable'
  const actionLabel = wage.disabled ? 'enabled' : 'disabled'
  executeToggleStatus(
    { pathParams: { wageId: wage.id }, queryParams: { action } },
    {
      onSuccess: () => {
        toastStore.addSuccessToast(`Wage ${actionLabel} successfully`)
        queryClient.invalidateQueries({ queryKey: teamKeys.detail(String(teamId.value)) })
      },
      onError: () => toastStore.addErrorToast(`Failed to ${action} wage`)
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
</script>
