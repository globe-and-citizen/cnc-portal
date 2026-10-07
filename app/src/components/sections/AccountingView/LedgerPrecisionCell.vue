<template>
  <UTooltip
    v-if="detail"
    v-model:open="open"
    :text="`${label}: ${detail}`"
    :disable-closing-trigger="true"
    :ignore-non-keyboard-focus="false"
    :ui="{ content: 'max-w-sm break-words' }"
  >
    <button
      type="button"
      class="focus-visible:ring-primary min-h-6 rounded whitespace-nowrap underline decoration-dotted underline-offset-4 hover:decoration-solid focus-visible:ring-2 focus-visible:outline-none"
      :aria-label="`${label}: ${detail}`"
      data-test="ledger-precision-value"
      @focus="open = true"
      @blur="open = false"
      @click="open = true"
      @keydown.esc="open = false"
    >
      {{ value }}
    </button>
  </UTooltip>
  <span v-else>{{ value }}</span>
</template>

<script setup lang="ts">
import { ref } from 'vue'

interface Props {
  value: string
  label: string
  detail?: string
}

defineProps<Props>()
const open = ref(false)
</script>
