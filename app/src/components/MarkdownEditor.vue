<template>
  <div
    class="border-default flex flex-col overflow-hidden rounded-md border"
    data-test="markdown-editor"
  >
    <!-- GitHub-style Write / Markdown toggle -->
    <div class="border-default bg-elevated/50 flex items-center gap-1 border-b p-1">
      <UButton
        v-for="tab in tabs"
        :key="tab.value"
        :variant="mode === tab.value ? 'soft' : 'ghost'"
        :color="mode === tab.value ? 'primary' : 'neutral'"
        size="xs"
        :data-test="`markdown-editor-tab-${tab.value}`"
        @click="mode = tab.value"
      >
        {{ tab.label }}
      </UButton>
    </div>

    <!-- Write: edit the rendered content directly (WYSIWYG) -->
    <UEditor
      v-if="mode === 'write'"
      v-slot="{ editor }"
      v-model="markdown"
      content-type="markdown"
      :placeholder="placeholder"
      class="max-h-96 min-h-52 overflow-y-auto"
      data-test="markdown-editor-wysiwyg"
    >
      <UEditorToolbar
        :editor="editor"
        :items="toolbarItems"
        class="border-default bg-default sticky top-0 z-10 flex flex-wrap border-b"
      />
    </UEditor>

    <!-- Markdown: raw source -->
    <UTextarea
      v-else
      v-model="markdown"
      :placeholder="placeholder"
      :rows="12"
      autoresize
      :ui="{ base: 'font-mono resize-y' }"
      data-test="markdown-editor-source"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { EditorToolbarItem } from '@nuxt/ui'

const props = withDefaults(
  defineProps<{
    modelValue: string
    placeholder?: string
  }>(),
  {
    placeholder: 'Write your weekly goals in Markdown…'
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

// The WYSIWYG editor and the raw textarea both bind this same string, so
// flipping tabs round-trips the content (GitHub Write/Markdown behaviour). Only
// one is mounted at a time (v-if) to avoid a serialize/parse feedback loop.
const markdown = computed({
  get: () => props.modelValue,
  set: (value: string) => emit('update:modelValue', value)
})

type Mode = 'write' | 'markdown'
const mode = ref<Mode>('write')
const tabs: { value: Mode; label: string }[] = [
  { value: 'write', label: 'Write' },
  { value: 'markdown', label: 'Markdown' }
]

// Handlers referenced by `kind` are provided by UEditor's default handler set;
// lucide icons match the set already used across the app.
const toolbarItems: EditorToolbarItem[] = [
  { kind: 'mark', mark: 'bold', icon: 'i-lucide-bold' },
  { kind: 'mark', mark: 'italic', icon: 'i-lucide-italic' },
  { kind: 'mark', mark: 'strike', icon: 'i-lucide-strikethrough' },
  { kind: 'heading', level: 1, icon: 'i-lucide-heading-1' },
  { kind: 'heading', level: 2, icon: 'i-lucide-heading-2' },
  { kind: 'bulletList', icon: 'i-lucide-list' },
  { kind: 'orderedList', icon: 'i-lucide-list-ordered' },
  { kind: 'blockquote', icon: 'i-lucide-quote' },
  { kind: 'codeBlock', icon: 'i-lucide-code' },
  { kind: 'link', icon: 'i-lucide-link' }
]
</script>
