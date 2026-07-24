<script setup lang="ts">
import { useClipboard } from '@vueuse/core'
import { useToast } from '@nuxt/ui/composables'

const props = defineProps<{
  // Value to copy to the clipboard (e.g. a full address).
  value: string
  // Optional label used in the confirmation toast.
  label?: string
}>()

const { copy, copied } = useClipboard()
const toast = useToast()

const onCopy = async () => {
  await copy(props.value)
  toast.add({
    title: 'Copied to clipboard',
    description: props.label ?? props.value,
    color: 'success',
    icon: 'i-lucide-clipboard-check'
  })
}
</script>

<template>
  <UButton
    :icon="copied ? 'i-lucide-check' : 'i-lucide-copy'"
    color="neutral"
    variant="ghost"
    size="xs"
    :aria-label="`Copy ${label ?? value}`"
    class="shrink-0"
    @click.stop.prevent="onCopy"
  />
</template>
