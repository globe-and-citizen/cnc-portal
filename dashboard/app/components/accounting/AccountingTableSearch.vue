<template>
  <UInput
    v-model="model"
    icon="i-lucide-search"
    :placeholder="placeholder"
    :disabled="disabled"
    size="sm"
    :class="inputClass"
    :ui="{ trailing: 'pe-1' }"
    autocomplete="off"
  >
    <template v-if="model?.length" #trailing>
      <UButton
        color="neutral"
        variant="link"
        size="sm"
        icon="i-lucide-circle-x"
        aria-label="Clear search"
        @click="model = ''"
      />
    </template>
  </UInput>
</template>

<script setup lang="ts">
/**
 * Local search field for accounting tables. Each parent keeps its own
 * `ref` / `defineModel` — instances do not share state.
 */
const model = defineModel<string>({ default: '' })

withDefaults(
  defineProps<{
    placeholder?: string
    disabled?: boolean
    inputClass?: string
  }>(),
  {
    placeholder: 'Search…',
    disabled: false,
    inputClass: 'w-full sm:w-64'
  }
)
</script>
