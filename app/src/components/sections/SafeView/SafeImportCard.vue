<template>
  <UCard>
    <div class="mb-4 flex items-center gap-3">
      <IconifyIcon icon="heroicons:arrow-down-tray" class="text-primary h-8 w-8" />
      <div>
        <h2 class="text-lg font-semibold">Import Existing Safe</h2>
        <p class="text-sm text-gray-500">
          Attach an existing multi-signature wallet without changing its configuration.
        </p>
      </div>
    </div>

    <UFormField label="Safe address" name="safeAddress" required>
      <UInput
        v-model="safeAddressInput"
        placeholder="0x..."
        :disabled="isInspecting || isRegistering"
        data-test="safe-import-address-input"
      />
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
        <div class="flex justify-between gap-4">
          <dt class="text-gray-500">Address</dt>
          <dd class="font-mono">{{ formatAddress(inspectedSafe.address) }}</dd>
        </div>
        <div class="flex justify-between gap-4">
          <dt class="text-gray-500">Owners</dt>
          <dd>{{ inspectedSafe.owners.length }}</dd>
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
    </div>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton
          color="neutral"
          variant="outline"
          :loading="isInspecting"
          :disabled="!canManageSafe || isInspecting || isRegistering || !safeAddressInput.trim()"
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
import { formatAddress } from '@/utils/format'
import TeamArchivedTooltip from '@/components/TeamArchivedTooltip.vue'

interface Props {
  teamId: number
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
  isPending: isInspecting
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
    teamStore.currentTeam?.ownerAddress.toLowerCase() === userDataStore.address.toLowerCase()
)

const inspectedSafe = computed(() => {
  const input = safeAddressInput.value.trim()
  if (!input || !isAddress(input)) return undefined

  return inspectedSafeData.value?.address.toLowerCase() === input.toLowerCase()
    ? inspectedSafeData.value
    : undefined
})

const canImport = computed(() => canManageSafe.value && !!inspectedSafe.value)

const inspectionError = computed(
  () => inspectError.value?.message || registrationError.value?.message
)

function handleInspect() {
  if (!canManageSafe.value) {
    toast.add({
      title: 'Error',
      description: 'Only the team owner can import a Safe',
      color: 'error'
    })
    return
  }

  inspectSafe(safeAddressInput.value.trim())
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
