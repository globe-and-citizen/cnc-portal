<template>
  <div data-test="companies-table" class="border-default overflow-hidden rounded-xl border">
    <UTable
      :data="pagedRows"
      :columns="columns"
      :ui="{
        tr: 'cursor-pointer hover:bg-elevated/50',
        th: 'text-muted',
        td: 'text-default'
      }"
    >
      <template #company-cell="{ row }">
        <div
          data-test="table-row"
          :data-team-id="row.original.teamId"
          class="flex items-center gap-3"
          @click="emit('open', row.original.teamId)"
        >
          <CompanyMonogram :name="row.original.name" :role="row.original.role" />
          <div class="min-w-0">
            <div class="text-default text-sm font-semibold">{{ row.original.name }}</div>
            <div class="text-muted max-w-[360px] truncate text-xs">
              {{ row.original.description }}
            </div>
          </div>
        </div>
      </template>

      <template #role-cell="{ row }">
        <RoleBadge :role="row.original.role" />
      </template>

      <template #members-cell="{ row }">
        <div class="flex items-center gap-2.5">
          <AvatarGroup :members="row.original.members" :max="3" size="sm" />
          <span class="text-muted text-sm font-medium">{{ row.original.memberCount }}</span>
        </div>
      </template>

      <template #treasury-cell="{ row }">
        <div class="text-default text-right text-sm font-bold">
          {{ row.original.balanceLabel }}
        </div>
      </template>

      <template #actions-cell="{ row }">
        <div class="flex justify-end" @click.stop>
          <UDropdownMenu :items="menuItems(row.original)">
            <UButton
              icon="heroicons:ellipsis-vertical"
              color="neutral"
              variant="ghost"
              size="sm"
              data-test="row-kebab"
              :aria-label="`Actions for ${row.original.name}`"
              @click.stop
            />

            <template #item="{ item }">
              <span :data-test="item.dataTest" class="flex w-full items-center gap-2">
                <UIcon v-if="item.icon" :name="item.icon" class="size-4 shrink-0" />
                {{ item.label }}
              </span>
            </template>
          </UDropdownMenu>
        </div>
      </template>
    </UTable>

    <div class="px-4">
      <TablePagination
        v-model:page="page"
        v-model:page-size="pageSize"
        :total="rows.length"
        noun="companies"
        data-test-prefix="companies-table"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { TableColumn, DropdownMenuItem } from '@nuxt/ui'
import type { Team, CompanyRole } from '@/types'
import { useTeamsTreasury } from '@/composables/treasury/useTeamsTreasury'
import TablePagination from '@/components/TablePagination.vue'
import CompanyMonogram from '@/components/sections/CompaniesView/CompanyMonogram.vue'
import AvatarGroup from '@/components/sections/CompaniesView/AvatarGroup.vue'
import RoleBadge from '@/components/sections/CompaniesView/RoleBadge.vue'

type CompanyAction = 'update' | 'archive' | 'hide' | 'delete'

interface CompanyRow {
  teamId: string
  name: string
  description: string
  role: CompanyRole
  members: { name?: string; address?: string; imageUrl?: string }[]
  memberCount: number
  balanceLabel: string
}

const props = defineProps<{
  teams: Team[]
}>()

const emit = defineEmits<{
  open: [teamId: string]
  action: [payload: { teamId: string; action: CompanyAction }]
}>()

const { byTeamId } = useTeamsTreasury(() => props.teams)

const rows = computed<CompanyRow[]>(() =>
  props.teams.map((team) => {
    const treasury = byTeamId.value[team.id]
    const role: CompanyRole = treasury?.role ?? 'employee'
    return {
      teamId: team.id,
      name: team.name,
      description: team.description,
      role,
      members: team.members.map((member) => ({
        name: member.name,
        address: member.address,
        imageUrl: member.imageUrl
      })),
      memberCount: team._count?.members ?? team.members.length,
      balanceLabel: treasury?.balanceLabel ?? '—'
    }
  })
)

const columns: TableColumn<CompanyRow>[] = [
  { id: 'company', header: 'Company' },
  { id: 'role', header: 'Role' },
  { id: 'members', header: 'Members' },
  { id: 'treasury', header: 'Treasury' },
  { id: 'actions', header: '' }
]

const page = ref(1)
const pageSize = ref(10)

// Reset to the first page whenever the dataset shrinks below the current page.
watch(
  () => rows.value.length,
  (total) => {
    const lastPage = Math.max(1, Math.ceil(total / pageSize.value))
    if (page.value > lastPage) page.value = lastPage
  }
)

watch(pageSize, () => {
  page.value = 1
})

const pagedRows = computed<CompanyRow[]>(() => {
  const start = (page.value - 1) * pageSize.value
  return rows.value.slice(start, start + pageSize.value)
})

/** A kebab item that also carries its `data-test` hook for the `#item` slot. */
type CompanyMenuItem = DropdownMenuItem & { dataTest: string }

/** Role-based kebab actions, mirroring the cards view (owner gets the full set). */
const ACTION_DEFS: Record<CompanyAction, { label: string; icon: string; dataTest: string }> = {
  update: { label: 'Update', icon: 'heroicons:pencil-square', dataTest: 'row-menu-update' },
  archive: { label: 'Archive', icon: 'heroicons:archive-box', dataTest: 'row-menu-archive' },
  hide: { label: 'Hide', icon: 'heroicons:eye-slash', dataTest: 'row-menu-hide' },
  delete: { label: 'Delete', icon: 'heroicons:trash', dataTest: 'row-menu-delete' }
}

const OWNER_ACTIONS: CompanyAction[] = ['update', 'archive', 'hide', 'delete']
const EMPLOYEE_ACTIONS: CompanyAction[] = ['hide']

function menuItems(row: CompanyRow): CompanyMenuItem[] {
  const actions = row.role === 'owner' ? OWNER_ACTIONS : EMPLOYEE_ACTIONS
  return actions.map((action) => {
    const def = ACTION_DEFS[action]
    return {
      label: def.label,
      icon: def.icon,
      dataTest: def.dataTest,
      onSelect: () => emit('action', { teamId: row.teamId, action })
    }
  })
}
</script>
