<template>
  <div class="flex flex-wrap gap-2">
    <UButton
      v-for="action in actionList"
      :key="action.key"
      size="sm"
      :color="action.color"
      variant="soft"
      :disabled="anyPending"
      @click="openAction(action.key)"
    >
      {{ action.label }}
    </UButton>

    <UModal
      :open="activeAction !== null"
      :title="activeMeta?.label"
      :close="{ onClick: () => close() }"
      @update:open="(open: boolean) => { if (!open) close() }"
    >
      <template #body>
        <div class="space-y-4">
          <UAlert
            color="warning"
            variant="subtle"
            icon="i-heroicons-exclamation-triangle"
            :title="`Legacy ${version} — irreversible`"
            description="This acts on a historical deployment. Double-check the target before confirming; the action cannot be undone."
          />

          <!-- Address field: transfer / withdrawToken / add / remove -->
          <UFormField
            v-if="activeMeta?.field === 'address'"
            :label="activeMeta.inputLabel"
            name="address"
          >
            <UInput
              v-model="addressInput"
              placeholder="0x…"
              :disabled="activeMutation?.isPending.value"
              class="w-full"
            />
          </UFormField>

          <!-- setFee: contractType + bps -->
          <template v-if="activeMeta?.field === 'fee'">
            <UFormField label="Contract type" name="contractType">
              <UInput
                v-model="contractTypeInput"
                placeholder="e.g. Bank"
                :disabled="activeMutation?.isPending.value"
                class="w-full"
              />
            </UFormField>
            <UFormField label="Fee (basis points)" name="feeBps">
              <UInput
                v-model.number="feeBpsInput"
                type="number"
                min="0"
                placeholder="e.g. 250 = 2.5%"
                :disabled="activeMutation?.isPending.value"
                class="w-full"
              />
            </UFormField>
          </template>

          <p v-if="activeMeta?.field === 'none'" class="text-sm text-gray-600 dark:text-gray-400">
            This will withdraw the full native balance to the current owner.
          </p>

          <UAlert
            v-if="activeMutation?.isError.value"
            color="error"
            variant="subtle"
            icon="i-lucide-terminal"
            title="Transaction failed"
            :description="errorDescription"
          />

          <div class="flex justify-end gap-3 pt-2">
            <UButton
              color="neutral"
              variant="outline"
              :disabled="activeMutation?.isPending.value"
              @click="close"
            >
              Cancel
            </UButton>
            <UButton
              color="primary"
              :disabled="!canSubmit"
              :loading="activeMutation?.isPending.value"
              @click="submit"
            >
              Confirm
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { isAddress, type Address } from 'viem'
import type { useContractWritesV3 } from '~/composables/useContractWritesV3'
import type { FeeCollectorVersion } from '~/artifacts/feeCollectorRegistry'
import { parseErrorV2 } from '@/utils'

type Mutation = ReturnType<typeof useContractWritesV3>
type ActionKey
  = | 'withdrawAll'
    | 'withdrawToken'
    | 'setFee'
    | 'transferOwnership'
    | 'addTokenSupport'
    | 'removeTokenSupport'

const props = defineProps<{
  version: FeeCollectorVersion
  withdrawAll: Mutation
  withdrawToken: Mutation
  setFee: Mutation
  transferOwnership: Mutation
  addTokenSupport: Mutation
  removeTokenSupport: Mutation
}>()

type FieldKind = 'address' | 'fee' | 'none'
interface ActionMeta {
  key: ActionKey
  label: string
  color: 'primary' | 'error' | 'neutral'
  field: FieldKind
  inputLabel?: string
}

const actionList: ActionMeta[] = [
  { key: 'withdrawAll', label: 'Withdraw native', color: 'primary', field: 'none' },
  { key: 'withdrawToken', label: 'Withdraw token', color: 'primary', field: 'address', inputLabel: 'Token address' },
  { key: 'setFee', label: 'Set fee', color: 'primary', field: 'fee' },
  { key: 'addTokenSupport', label: 'Add token', color: 'neutral', field: 'address', inputLabel: 'Token address' },
  { key: 'removeTokenSupport', label: 'Remove token', color: 'neutral', field: 'address', inputLabel: 'Token address' },
  { key: 'transferOwnership', label: 'Transfer ownership', color: 'error', field: 'address', inputLabel: 'New owner address' }
]

const mutations = computed<Record<ActionKey, Mutation>>(() => ({
  withdrawAll: props.withdrawAll,
  withdrawToken: props.withdrawToken,
  setFee: props.setFee,
  transferOwnership: props.transferOwnership,
  addTokenSupport: props.addTokenSupport,
  removeTokenSupport: props.removeTokenSupport
}))

const anyPending = computed(() =>
  Object.values(mutations.value).some(m => m.isPending.value)
)

const activeAction = ref<ActionKey | null>(null)
const addressInput = ref('')
const contractTypeInput = ref('')
const feeBpsInput = ref<number | null>(null)

const activeMeta = computed(() =>
  activeAction.value ? actionList.find(a => a.key === activeAction.value) : undefined
)
const activeMutation = computed(() =>
  activeAction.value ? mutations.value[activeAction.value] : undefined
)

const errorDescription = computed(() => {
  const err = activeMutation.value?.error.value
  return err ? parseErrorV2(err) : ''
})

const canSubmit = computed(() => {
  if (!activeMeta.value || activeMutation.value?.isPending.value) return false
  switch (activeMeta.value.field) {
    case 'address':
      return isAddress(addressInput.value)
    case 'fee':
      return contractTypeInput.value.trim().length > 0
        && feeBpsInput.value !== null
        && feeBpsInput.value >= 0
    case 'none':
      return true
    default:
      return false
  }
})

const openAction = (key: ActionKey) => {
  activeAction.value = key
}

const close = () => {
  if (activeMutation.value?.isPending.value) return
  activeMutation.value?.reset()
  activeAction.value = null
  addressInput.value = ''
  contractTypeInput.value = ''
  feeBpsInput.value = null
}

// Reset stale error/state whenever a different action modal opens.
watch(activeAction, (key) => {
  if (key === null) return
  addressInput.value = ''
  contractTypeInput.value = ''
  feeBpsInput.value = null
  mutations.value[key].reset()
})

const submit = async () => {
  const mutation = activeMutation.value
  const meta = activeMeta.value
  if (!mutation || !meta) return

  let args: readonly unknown[] = []
  switch (meta.key) {
    case 'withdrawAll':
      args = []
      break
    case 'setFee':
      args = [contractTypeInput.value.trim(), BigInt(feeBpsInput.value ?? 0)]
      break
    default:
      // all remaining actions take a single address argument
      args = [addressInput.value as Address]
  }

  await mutation.mutateAsync({ args })
  close()
}
</script>
