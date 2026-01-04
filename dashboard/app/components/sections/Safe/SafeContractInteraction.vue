<template>
  <UModal
    :open="open"
    title="Safe Contract Interaction"
    class="max-w-2xl"
    :close="{ onClick: handleClose }"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <template #body>
      <div class="space-y-4">
        <UFormGroup label="Contract Type">
          <USelectMenu
            v-model="selectedAbiOption"
            :items="abiOptions"
            option-attribute="label"
            value-attribute="value"
            placeholder="Select contract type"
          />
        </UFormGroup>

        <UFormGroup label="Contract Address">
          <UInput v-model="contractAddress" placeholder="0x..." />
        </UFormGroup>

        <UAlert
          v-if="loadError"
          color="error"
          variant="soft"
          :title="loadError"
        />

        <UAlert
          v-else-if="functionsLoaded"
          color="success"
          variant="soft"
          title="ABI loaded"
        >
          <template #description>
            <p class="text-sm text-gray-700">
              {{ readFunctions.length }} read function(s), {{ writeFunctions.length }} write function(s) detected.
            </p>
          </template>
        </UAlert>

        <div class="grid lg:grid-cols-2 gap-4">
          <!-- Read Functions -->
          <div class="border rounded-lg p-4 space-y-3">
            <div class="flex items-center justify-between gap-2">
              <div>
                <h3 class="text-lg font-semibold">
                  Read
                </h3>
                <p class="text-sm text-gray-600">
                  Directly call view/pure methods
                </p>
              </div>
              <UBadge color="neutral" variant="soft">
                {{ readFunctions.length }}
              </UBadge>
            </div>

            <div v-if="readFunctions.length === 0" class="text-sm text-gray-500">
              No view/pure functions detected.
            </div>

          <div v-else class="space-y-3">
            <USelectMenu
              v-model="selectedReadOption"
              :items="readOptions"
              option-attribute="label"
              value-attribute="value"
              placeholder="Select a read function"
            />

              <div v-if="selectedReadFunction">
                <div
                  v-for="(input, idx) in selectedReadFunction.inputs"
                  :key="`${selectedReadFunction.key}-${idx}`"
                  class="grid gap-1"
                >
                  <label class="text-sm text-gray-700">
                    {{ input.name || `arg${idx}` }} <span class="text-gray-500">({{ input.type }})</span>
                  </label>
                  <UInput
                    v-model="readArgs[idx]!.value"
                    :placeholder="placeholderForType(input.type)"
                  />
                </div>
              </div>

              <UButton
                :loading="isReading"
                :disabled="!selectedReadFunction"
                block
                @click="onCallReadFunction"
              >
                Call Function
              </UButton>

              <UAlert
                v-if="readError"
                color="error"
                variant="soft"
                :title="readError"
              />

              <div
                v-if="readResult !== null && readResult !== ''"
                class="bg-gray-50 rounded-md p-3 text-sm overflow-auto border"
              >
                <div class="text-gray-600 mb-1">
                  Result
                </div>
                <pre class="whitespace-pre-wrap break-all text-gray-800">{{ readResult }}</pre>
              </div>
            </div>
          </div>

          <!-- Write Functions -->
          <div class="border rounded-lg p-4 space-y-3">
            <div class="flex items-center justify-between gap-2">
              <div>
                <h3 class="text-lg font-semibold">
                  Write via Safe
                </h3>
                <p class="text-sm text-gray-600">
                  Encode data and propose a Safe transaction
                </p>
              </div>
              <UBadge color="neutral" variant="soft">
                {{ writeFunctions.length }}
              </UBadge>
            </div>

            <div v-if="writeFunctions.length === 0" class="text-sm text-gray-500">
              No nonpayable/payable functions detected.
            </div>

          <div v-else class="space-y-3">
            <USelectMenu
              v-model="selectedWriteOption"
              :items="writeOptions"
              option-attribute="label"
              value-attribute="value"
              placeholder="Select a write function"
            />

              <div v-if="selectedWriteFunction">
                <div
                  v-for="(input, idx) in selectedWriteFunction.inputs"
                  :key="`${selectedWriteFunction.key}-${idx}`"
                  class="grid gap-1"
                >
                  <label class="text-sm text-gray-700">
                    {{ input.name || `arg${idx}` }} <span class="text-gray-500">({{ input.type }})</span>
                  </label>
                  <UInput
                    v-model="writeArgs[idx]!.value"
                    :placeholder="placeholderForType(input.type)"
                  />
                </div>

                <UFormGroup
                  v-if="selectedWriteFunction.payable"
                  label="Value (ETH)"
                  description="Optional amount to send with the call"
                >
                  <UInput
                    v-model="payableValue"
                    placeholder="0"
                    type="number"
                    min="0"
                    step="0.000000000000000001"
                  />
                </UFormGroup>
              </div>

              <UButton
                :loading="isProposing"
                :disabled="!selectedWriteFunction || !connectedAddress"
                color="primary"
                block
                @click="proposeWriteTransaction"
              >
                Propose Transaction
              </UButton>

              <UAlert
                v-if="writeError"
                color="error"
                variant="soft"
                :title="writeError"
              />
              <UAlert
                v-if="writeSuccess"
                color="success"
                variant="soft"
                :title="`Proposed to Safe`"
              >
                <template #description>
                  <p class="text-xs break-all mt-1">
                    SafeTxHash: {{ writeSuccess }}
                  </p>
                </template>
              </UAlert>
            </div>
          </div>
        </div>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useSafeContractInteraction } from '@/composables/Safe/useSafeContractInteraction'

const props = defineProps<{
  modelValue: boolean
  safeAddress: string
}>()
const emit = defineEmits(['update:modelValue'])

const open = ref(props.modelValue)
watch(() => props.modelValue, v => open.value = v)
watch(open, v => emit('update:modelValue', v))

const {
  abiOptions,
  selectedAbiOption,
  readOptions,
  selectedReadOption,
  writeOptions,
  selectedWriteOption,
  selectedReadFunction,
  selectedWriteFunction,
  readFunctions,
  writeFunctions,
  functionsLoaded,
  loadError,
  contractAddress,
  readArgs,
  writeArgs,
  payableValue,
  isReading,
  readError,
  readResult,
  onCallReadFunction,
  isProposing,
  writeError,
  writeSuccess,
  proposeWriteTransaction,
  placeholderForType,
  connectedAddress,
  refreshConnectedAddress
} = useSafeContractInteraction({
  safeAddress: computed(() => props.safeAddress)
})

onMounted(() => {
  refreshConnectedAddress()
})

function handleClose() {
  emit('update:modelValue', false)
}
</script>
