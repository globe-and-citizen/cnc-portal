<template>
  <UCard class="h-full">
    <div class="mb-4 flex items-center gap-3">
      <IconifyIcon icon="heroicons:arrow-down-tray" class="text-primary h-8 w-8" />
      <div>
        <h2 class="text-lg font-semibold">Import an existing Safe</h2>
        <p class="text-sm text-gray-500">
          Attach an existing multi-signature wallet without changing its configuration.
        </p>
      </div>
    </div>

    <UAlert
      color="info"
      variant="soft"
      icon="i-lucide-network"
      :description="`The Safe must be deployed on ${network.networkName}.`"
      data-test="safe-import-network"
    />

    <UAlert
      v-if="!canManageSafe"
      class="mt-4"
      color="warning"
      variant="soft"
      icon="i-lucide-lock-keyhole"
      :description="importPermissionHint"
      data-test="safe-import-permission-notice"
    />

    <UFormField class="mt-4" label="Safe address" name="safeAddress" required>
      <UInput
        v-model="safeAddressInput"
        class="w-full"
        placeholder="0x..."
        :disabled="isInspecting || isRegistering"
        aria-describedby="safe-import-help"
        data-test="safe-import-address-input"
      />
      <p id="safe-import-help" class="mt-1 text-xs text-gray-500">
        Inspecting is read-only. Importing becomes available after the Safe details are verified.
      </p>
    </UFormField>

    <UAlert
      v-if="inspectionError"
      class="mt-4"
      color="error"
      :description="inspectionError"
      data-test="safe-import-error"
    />

    <div
      v-if="inspectedSafe"
      class="bg-elevated mt-4 rounded-lg p-4"
      data-test="safe-import-summary"
    >
      <h3 class="font-semibold">Confirm Safe details</h3>
      <dl class="mt-3 space-y-2 text-sm">
        <div class="flex flex-col gap-1">
          <dt class="text-gray-500">Address</dt>
          <dd class="min-w-0">
            <AddressToolTip
              :address="inspectedSafe.address"
              class="max-w-full font-mono text-xs break-all"
            />
          </dd>
        </div>
        <div>
          <dt class="text-gray-500">Owners</dt>
          <dd class="mt-1">
            <details>
              <summary
                class="text-primary cursor-pointer text-sm font-medium"
                data-test="safe-import-owners-toggle"
              >
                View {{ inspectedSafe.owners.length }} owner{{
                  inspectedSafe.owners.length === 1 ? '' : 's'
                }}
              </summary>
              <ul class="mt-2 space-y-2">
                <li
                  v-for="owner in inspectedSafe.owners"
                  :key="owner"
                  class="flex items-center justify-between gap-3"
                >
                  <AddressToolTip :address="owner" slice class="min-w-0" />
                  <span
                    v-if="isConnectedAddress(owner)"
                    class="text-primary shrink-0 text-xs font-medium"
                  >
                    Connected wallet
                  </span>
                </li>
              </ul>
            </details>
          </dd>
        </div>
        <div class="flex justify-between gap-4">
          <dt class="text-gray-500">Threshold</dt>
          <dd>{{ inspectedSafe.threshold }} of {{ inspectedSafe.owners.length }}</dd>
        </div>
        <div class="flex justify-between gap-4">
          <dt class="text-gray-500">Version</dt>
          <dd>{{ inspectedSafe.version }}</dd>
        </div>
      </dl>
      <UAlert
        class="mt-4"
        color="info"
        variant="soft"
        description="Importing only registers this Safe with CNC. It does not send an on-chain transaction or change the Safe."
      />
      <UButton
        class="mt-4"
        color="neutral"
        variant="link"
        data-test="safe-import-reset-button"
        @click="resetInspection"
      >
        Use another address
      </UButton>
    </div>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton
          color="neutral"
          variant="outline"
          :loading="isInspecting"
          :disabled="isInspecting || isRegistering || !safeAddressInput.trim()"
          data-test="inspect-safe-button"
          @click="handleInspect"
        >
          Inspect Safe
        </UButton>
        <TeamArchivedTooltip v-slot="{ disabled: archivedDisabled }">
          <UButton
            color="primary"
            :loading="isRegistering"
            :disabled="!canImport || isRegistering || archivedDisabled"
            :title="importPermissionHint"
            data-test="confirm-safe-import-button"
            @click="handleImport"
          >
            Import Safe
          </UButton>
        </TeamArchivedTooltip>
      </div>
    </template>
  </UCard>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { Icon as IconifyIcon } from '@iconify/vue'
import { isAddress, type Address } from 'viem'
import { useToast } from '@nuxt/ui/composables'
import { useUserDataStore, useTeamStore } from '@/stores'
import { useInspectSafe } from '@/composables/safe/useSafeImport'
import { useCreateContractMutation } from '@/queries/contract.queries'
import { NETWORK } from '@/constant'
import AddressToolTip from '@/components/ui/AddressToolTip.vue'
import TeamArchivedTooltip from '@/components/ui/TeamArchivedTooltip.vue'

interface Props {
  teamId: number
  teamOwnerAddress?: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'safe-imported': [address: Address]
}>()

const teamStore = useTeamStore()
const userDataStore = useUserDataStore()
const toast = useToast()
const safeAddressInput = ref('')

const {
  mutate: inspectSafe,
  data: inspectedSafeData,
  error: inspectError,
  isPending: isInspecting,
  reset: resetInspectSafe
} = useInspectSafe()
const {
  mutate: createContract,
  isPending: isRegistering,
  error: registrationError
} = useCreateContractMutation()

const canManageSafe = computed(
  () =>
    !!userDataStore.address &&
    isAddress(userDataStore.address) &&
    (props.teamOwnerAddress ?? teamStore.currentTeam?.ownerAddress)?.toLowerCase() ===
      userDataStore.address.toLowerCase()
)

const inspectedSafe = computed(() => {
  const input = safeAddressInput.value.trim()
  if (!input || !isAddress(input)) return undefined

  return inspectedSafeData.value?.address.toLowerCase() === input.toLowerCase()
    ? inspectedSafeData.value
    : undefined
})

const canImport = computed(() => canManageSafe.value && !!inspectedSafe.value)
const network = computed(() => NETWORK)

const importPermissionHint = computed(() => {
  if (!userDataStore.address) return 'Connect the team owner wallet to import this Safe.'
  if (!canManageSafe.value) return 'Only the team owner can attach a Safe to this team.'
  if (!inspectedSafe.value) return 'Inspect and confirm a valid Safe before importing it.'
  return 'Register this existing Safe with the team without changing it on-chain.'
})

const inspectionError = computed(
  () => inspectError.value?.message || registrationError.value?.message
)

function handleInspect() {
  inspectSafe(safeAddressInput.value.trim())
}

function isConnectedAddress(address: Address) {
  return userDataStore.address?.toLowerCase() === address.toLowerCase()
}

function resetInspection() {
  safeAddressInput.value = ''
  resetInspectSafe()
}

function handleImport() {
  if (!inspectedSafe.value || !userDataStore.address) return

  createContract(
    {
      body: {
        teamId: String(props.teamId),
        contractAddress: inspectedSafe.value.address,
        contractType: 'Safe',
        deployer: userDataStore.address
      }
    },
    {
      onSuccess: () => {
        toast.add({ title: 'Success', description: 'Safe imported successfully', color: 'success' })
        emit('safe-imported', inspectedSafe.value!.address)
      }
    }
  )
}
</script>
