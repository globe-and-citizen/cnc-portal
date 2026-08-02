<template>
  <UModal
    :open="open"
    :title="title"
    :description="description"
    @update:open="emit('update:open', $event)"
  >
    <template #body>
      <UAlert
        v-if="errorMessage"
        color="error"
        variant="soft"
        :description="errorMessage"
        class="mb-4"
        data-test="company-action-error"
      />
      <p class="text-default text-sm">
        Are you sure you want to {{ verb }} the company <span class="font-bold">{{ teamName }}</span
        >?
      </p>
      <div class="mt-4 flex justify-center gap-2">
        <UButton
          :color="confirmColor"
          :label="confirmLabel"
          :loading="loading"
          :disabled="loading"
          data-test="company-action-confirm"
          @click="emit('confirm')"
        />
        <UButton
          color="primary"
          variant="outline"
          label="Cancel"
          data-test="company-action-cancel"
          @click="emit('update:open', false)"
        />
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { computed } from 'vue'

type ActionKind = 'archive' | 'delete'

interface Props {
  open: boolean
  kind: ActionKind
  teamName?: string
  loading?: boolean
  errorMessage?: string
}

const props = withDefaults(defineProps<Props>(), {
  teamName: '',
  loading: false,
  errorMessage: ''
})

const emit = defineEmits<{
  'update:open': [value: boolean]
  confirm: []
}>()

const verb = computed(() => (props.kind === 'archive' ? 'archive' : 'delete'))

const title = computed(() => (props.kind === 'archive' ? 'Archive Company' : 'Delete Company'))

const description = computed(() =>
  props.kind === 'archive'
    ? 'This action will remove the company from the dashboard and prevent it from being used.'
    : 'This action cannot be undone. Please confirm that you want to permanently delete this company.'
)

const confirmLabel = computed(() => (props.kind === 'archive' ? 'Archive' : 'Delete'))

const confirmColor = computed(() => (props.kind === 'archive' ? 'warning' : 'error'))
</script>
