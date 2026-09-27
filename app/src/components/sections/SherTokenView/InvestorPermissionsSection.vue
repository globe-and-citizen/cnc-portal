<template>
  <UCard data-test="investor-permissions-section">
    <template #header>
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 class="text-lg font-medium text-neutral-900 dark:text-white">Investor permissions</h3>
          <p class="mt-1 text-sm text-neutral-500">
            Current ownership, administrator, and token minter authority.
          </p>
        </div>
        <UTooltip :text="manageTooltip">
          <UButton
            icon="i-heroicons-user-plus"
            :disabled="!canManage || isWriteDisabled"
            data-test="grant-minter-open"
            @click="openGrantModal"
          >
            Grant minter role
          </UButton>
        </UTooltip>
      </div>
    </template>

    <USkeleton v-if="permissions.isPending.value" class="h-32 w-full" />
    <template v-else>
      <UAlert
        v-if="evidence !== 'complete'"
        class="mb-4"
        :color="evidence === 'unavailable' ? 'error' : 'warning'"
        variant="soft"
        icon="i-heroicons-exclamation-triangle"
        :title="
          evidence === 'unavailable'
            ? 'Permission history is unavailable'
            : 'Permission evidence is incomplete'
        "
        description="The table only shows roles that could be verified on-chain. Retry before relying on it as a complete authority list."
        data-test="permission-evidence-warning"
      />

      <UTable :data="rows" :columns="columns" data-test="investor-permissions-table">
        <template #identity-cell="{ row: { original: row } }">
          <div class="flex flex-col">
            <span class="font-medium">{{ row.label }}</span>
            <AddressTooltip :address="row.address" />
          </div>
        </template>

        <template #roles-cell="{ row: { original: row } }">
          <div class="flex flex-wrap gap-1.5">
            <UBadge v-if="row.isOwner" color="primary" variant="soft">Owner</UBadge>
            <UBadge v-if="row.isAdmin" color="info" variant="soft">Administrator</UBadge>
            <UBadge v-if="row.isMinter" color="success" variant="soft">Minter</UBadge>
          </div>
        </template>

        <template #type-cell="{ row: { original: row } }">
          <span class="capitalize">{{ row.kind }}</span>
        </template>

        <template #actions-cell="{ row: { original: row } }">
          <UTooltip :text="revokeTooltip(row)">
            <UButton
              v-if="row.isMinter"
              color="error"
              variant="soft"
              size="sm"
              :disabled="!canRevoke(row)"
              :data-test="`revoke-minter-${row.address.toLowerCase()}`"
              @click="openRevokeModal(row)"
            >
              Revoke minter
            </UButton>
          </UTooltip>
        </template>
      </UTable>
    </template>

    <UModal
      v-model:open="grantModalOpen"
      title="Grant Investor minter role"
      description="Choose the team member or contract that may issue new Investor tokens."
    >
      <template #body>
        <div class="flex flex-col gap-4">
          <SelectMemberContractsInput v-model="grantTarget" />
          <UAlert
            v-if="actionError"
            color="error"
            variant="soft"
            :description="actionError"
            data-test="grant-minter-error"
          />
          <div class="flex justify-end gap-2">
            <UButton color="neutral" variant="outline" @click="grantModalOpen = false">
              Cancel
            </UButton>
            <UButton
              :loading="grantRole.isPending.value"
              :disabled="!canSubmitGrant"
              data-test="grant-minter-confirm"
              @click="grantMinter"
            >
              Grant role
            </UButton>
          </div>
        </div>
      </template>
    </UModal>

    <UModal
      v-model:open="revokeModalOpen"
      title="Revoke Investor minter role"
      description="The selected account will no longer be able to issue Investor tokens."
    >
      <template #body>
        <div v-if="revokeTarget" class="flex flex-col gap-4">
          <UAlert
            v-if="revokeTarget.isProtectedTechnical"
            color="warning"
            variant="soft"
            icon="i-heroicons-exclamation-triangle"
            title="This role supports an automated token flow"
            :description="`${revokeTarget.label} may stop working until the minter role is restored.`"
          />
          <label v-if="revokeTarget.isProtectedTechnical" class="flex items-start gap-2 text-sm">
            <UCheckbox v-model="impactConfirmed" data-test="revoke-impact-confirmation" />
            <span>I understand the affected contract may no longer mint tokens.</span>
          </label>
          <UAlert
            v-if="actionError"
            color="error"
            variant="soft"
            :description="actionError"
            data-test="revoke-minter-error"
          />
          <div class="flex justify-end gap-2">
            <UButton color="neutral" variant="outline" @click="revokeModalOpen = false">
              Cancel
            </UButton>
            <UButton
              color="error"
              :loading="revokeRole.isPending.value"
              :disabled="revokeTarget.isProtectedTechnical && !impactConfirmed"
              data-test="revoke-minter-confirm"
              @click="revokeMinter"
            >
              Revoke role
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </UCard>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { isAddress, type Address } from 'viem'
import AddressTooltip from '@/components/ui/AddressTooltip.vue'
import SelectMemberContractsInput from '@/components/ui/inputs/SelectMemberContractsInput.vue'
import { useInvestorHasRole, useInvestorPermissions } from '@/composables/investor/permissions'
import { useGrantInvestorRole, useRevokeInvestorRole } from '@/composables/investor/writes'
import { useTeamWriteGuard } from '@/composables/useTeamWriteGuard'
import { useTeamStore, useUserDataStore } from '@/stores'
import { DEFAULT_ADMIN_ROLE, MINTER_ROLE } from '@/queries/investorPermissions.queries'
import { classifyError } from '@/utils/errors/classifyContractError'

type PermissionRow = {
  address: Address
  label: string
  kind: 'member' | 'contract' | 'external'
  isOwner: boolean
  isAdmin: boolean
  isMinter: boolean
  isProtectedTechnical: boolean
}

const protectedTechnicalTypes = new Set(['CashRemunerationEIP712', 'SafeDepositRouter', 'Vesting'])

const teamStore = useTeamStore()
const userStore = useUserDataStore()
const toast = useToast()
const { isWriteDisabled, archivedTooltip } = useTeamWriteGuard()
const permissions = useInvestorPermissions()
const currentAccount = computed(() =>
  isAddress(userStore.address) ? (userStore.address as Address) : undefined
)
const adminRole = useInvestorHasRole(DEFAULT_ADMIN_ROLE, currentAccount)
const grantRole = useGrantInvestorRole()
const revokeRole = useRevokeInvestorRole()

const grantModalOpen = ref(false)
const revokeModalOpen = ref(false)
const grantTarget = ref({ name: '', address: '' })
const revokeTarget = ref<PermissionRow | null>(null)
const impactConfirmed = ref(false)
const actionError = ref('')

const evidence = computed(() => permissions.data.value?.evidence ?? 'unavailable')
const canManage = computed(() => adminRole.data.value === true)
const manageTooltip = computed(() => {
  if (archivedTooltip.value) return archivedTooltip.value
  if (!canManage.value) return 'Only an Investor administrator can manage minter roles'
  return undefined
})

const rows = computed<PermissionRow[]>(() =>
  (permissions.data.value?.accounts ?? []).map((account) => {
    const normalized = account.address.toLowerCase()
    const member = teamStore.currentTeam?.members.find(
      (candidate) => candidate.address.toLowerCase() === normalized
    )
    const contract = teamStore.currentTeam?.teamContracts.find(
      (candidate) => candidate.address.toLowerCase() === normalized
    )
    return {
      address: account.address,
      label: member?.name ?? contract?.type ?? 'External account',
      kind: member ? 'member' : contract ? 'contract' : 'external',
      isOwner: account.isOwner,
      isAdmin: account.isAdmin === true,
      isMinter: account.isMinter === true,
      isProtectedTechnical: !!contract && protectedTechnicalTypes.has(contract.type)
    }
  })
)

const canSubmitGrant = computed(
  () =>
    canManage.value &&
    isAddress(grantTarget.value.address) &&
    !rows.value.some(
      (row) => row.address.toLowerCase() === grantTarget.value.address.toLowerCase() && row.isMinter
    ) &&
    !grantRole.isPending.value
)

function canRevoke(row: PermissionRow) {
  return canManage.value && !isWriteDisabled.value && !row.isOwner && !revokeRole.isPending.value
}

function revokeTooltip(row: PermissionRow) {
  if (row.isOwner) return 'The Investor owner must retain the minter role'
  if (!canManage.value) return 'Only an Investor administrator can revoke minter roles'
  return undefined
}

function openGrantModal() {
  if (!canManage.value || isWriteDisabled.value) return
  grantTarget.value = { name: '', address: '' }
  actionError.value = ''
  grantModalOpen.value = true
}

function openRevokeModal(row: PermissionRow) {
  if (!canRevoke(row)) return
  revokeTarget.value = row
  impactConfirmed.value = false
  actionError.value = ''
  revokeModalOpen.value = true
}

function userFacingError(error: unknown) {
  const classified = classifyError(error, { contract: 'Investor' })
  return classified.category === 'user_rejected'
    ? 'You rejected the wallet request.'
    : classified.userMessage
}

async function grantMinter() {
  if (!canSubmitGrant.value) return
  actionError.value = ''
  try {
    await grantRole.mutateAsync({ args: [MINTER_ROLE, grantTarget.value.address as Address] })
    toast.add({ title: 'Minter role granted', color: 'success' })
    grantModalOpen.value = false
  } catch (error) {
    actionError.value = userFacingError(error)
  }
}

async function revokeMinter() {
  const target = revokeTarget.value
  if (!target || !canRevoke(target)) return
  if (target.isProtectedTechnical && !impactConfirmed.value) return
  actionError.value = ''
  try {
    await revokeRole.mutateAsync({ args: [MINTER_ROLE, target.address] })
    toast.add({ title: 'Minter role revoked', color: 'success' })
    revokeModalOpen.value = false
  } catch (error) {
    actionError.value = userFacingError(error)
  }
}

const columns = [
  { accessorKey: 'identity', header: 'Account' },
  { accessorKey: 'roles', header: 'Roles' },
  { accessorKey: 'type', header: 'Type' },
  { accessorKey: 'actions', header: 'Actions' }
]
</script>
